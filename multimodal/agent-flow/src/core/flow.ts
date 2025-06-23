import { Node } from './node';
import { SharedStore } from './shared-store';
import { AnyData, ConnectionCondition, ConnectionOptions, FlowExecutionOptions } from './types';

/**
 * 节点连接定义
 */
interface Connection {
  from: string;
  to: string;
  condition?: ConnectionCondition;
}

/**
 * Flow - 定义节点间的连接和数据流向
 *
 * Flow 是 Pocket Flow 的核心概念，代表数据在节点之间的流动方式。
 * 通过 Flow，你可以定义节点之间的连接关系，并控制数据的流向。
 */
export class Flow {
  private nodes: Map<string, Node> = new Map();
  private connections: Connection[] = [];
  private startNodes: Set<string> = new Set();
  private executedNodes: Set<string> = new Set();

  /**
   * 添加节点
   *
   * @param nodeOrId 节点或节点 ID
   * @param nodeInstance 节点实例(如果第一个参数是 ID)
   * @returns this (链式调用)
   */
  addNode(nodeOrId: Node | string, nodeInstance?: Node): Flow {
    if (typeof nodeOrId === 'string' && nodeInstance) {
      this.nodes.set(nodeOrId, nodeInstance);
      // 默认情况下，所有节点都是起始节点，直到它们被连接为目标
      this.startNodes.add(nodeOrId);
    } else if (nodeOrId instanceof Node) {
      this.nodes.set(nodeOrId.getId(), nodeOrId);
      // 默认情况下，所有节点都是起始节点，直到它们被连接为目标
      this.startNodes.add(nodeOrId.getId());
    } else {
      throw new Error('Invalid arguments for addNode');
    }

    return this;
  }

  /**
   * 连接两个节点
   *
   * @param from 源节点 ID
   * @param to 目标节点 ID
   * @param options 连接选项
   * @returns this (链式调用)
   */
  connect(from: string, to: string, options: ConnectionOptions = {}): Flow {
    if (!this.nodes.has(from)) {
      throw new Error(`Source node "${from}" not found`);
    }

    if (!this.nodes.has(to)) {
      throw new Error(`Target node "${to}" not found`);
    }

    this.connections.push({
      from,
      to,
      condition: options.condition,
    });

    // 目标节点不再是起始节点
    this.startNodes.delete(to);

    return this;
  }

  /**
   * 设置中止信号
   *
   * @param signal 中止信号
   * @returns this (链式调用)
   */
  withAbortSignal(signal: AbortSignal): Flow {
    this.abortSignal = signal;
    return this;
  }

  /**
   * 执行流程
   *
   * @param options 执行选项
   * @returns 执行结果(最后一个节点的输出)
   */
  async execute(options: FlowExecutionOptions = {}): Promise<AnyData> {
    const store = options.store || new SharedStore();
    const input = options.input || {};
    const parallel = options.parallel || false;
    this.abortSignal = options.abortSignal;

    // 重置已执行节点集合
    this.executedNodes.clear();

    // 如果没有节点，直接返回输入
    if (this.nodes.size === 0) {
      return input;
    }

    // 如果没有起始节点，抛出错误
    if (this.startNodes.size === 0) {
      throw new Error('No start nodes found in flow');
    }

    // 执行所有起始节点
    const startNodeIds = Array.from(this.startNodes);

    let result: AnyData;

    if (parallel) {
      // 并行执行
      await Promise.all(startNodeIds.map((nodeId) => this.executeNode(nodeId, input, store)));

      // 从存储中获取所有输出
      result = startNodeIds.map((nodeId) => store.get(`node:${nodeId}:output`));
    } else {
      // 顺序执行
      for (const nodeId of startNodeIds) {
        result = await this.executeNode(nodeId, input, store);
      }
    }

    return result;
  }

  /**
   * 批量处理数据
   *
   * @param items 要处理的数据项数组
   * @param options 执行选项
   * @returns 处理结果数组
   */
  async batch<T, R>(items: T[], options: FlowExecutionOptions = {}): Promise<R[]> {
    const store = options.store || new SharedStore();
    const parallel = options.parallel || false;
    this.abortSignal = options.abortSignal;

    const results: R[] = [];

    if (parallel) {
      // 并行处理所有项
      const promises = items.map((item) => {
        return this.execute({
          input: item,
          store,
          abortSignal: this.abortSignal,
        }) as Promise<R>;
      });

      return Promise.all(promises);
    } else {
      // 顺序处理所有项
      for (const item of items) {
        if (this.abortSignal?.aborted) {
          break;
        }

        const result = (await this.execute({
          input: item,
          store,
          abortSignal: this.abortSignal,
        })) as R;

        results.push(result);
      }

      return results;
    }
  }

  private abortSignal?: AbortSignal;

  /**
   * 执行单个节点，然后执行其连接的目标节点
   *
   * @param nodeId 节点 ID
   * @param input 输入数据
   * @param store 共享存储
   * @returns 执行结果
   */
  private async executeNode(nodeId: string, input: AnyData, store: SharedStore): Promise<AnyData> {
    // 检查中止信号
    if (this.abortSignal?.aborted) {
      throw new Error('Execution aborted');
    }

    // 获取节点
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node "${nodeId}" not found`);
    }

    // 防止重复执行
    if (this.executedNodes.has(nodeId)) {
      return store.get(`node:${nodeId}:output`);
    }

    // 标记为已执行
    this.executedNodes.add(nodeId);

    // 执行节点
    const output = await node.execute(input, store);

    // 找出所有以该节点为源的连接
    const outgoingConnections = this.connections.filter((conn) => conn.from === nodeId);

    // 执行所有符合条件的目标节点
    const targetResults: AnyData[] = [];

    for (const conn of outgoingConnections) {
      // 检查连接条件
      if (conn.condition && !conn.condition(output, store)) {
        continue;
      }

      // 执行目标节点
      const targetResult = await this.executeNode(conn.to, output, store);
      targetResults.push(targetResult);
    }

    // 如果有目标节点，返回最后一个目标节点的结果；否则返回当前节点的结果
    return targetResults.length > 0 ? targetResults[targetResults.length - 1] : output;
  }
}
