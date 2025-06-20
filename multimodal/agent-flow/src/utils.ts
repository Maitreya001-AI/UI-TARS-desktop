/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flow } from './flow';
import { Node } from './node';
import { SharedStore } from './shared-store';
import { AnyData } from './types';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 日志记录器
 */
export class FlowLogger {
  private static instance: FlowLogger;
  private logStore: Array<{
    timestamp: number;
    level: LogLevel;
    nodeId?: string;
    flowId?: string;
    message: string;
    data?: any;
  }> = [];
  private listeners: ((log: any) => void)[] = [];
  private logLevel: LogLevel = LogLevel.INFO;

  /**
   * 获取实例
   */
  static getInstance(): FlowLogger {
    if (!FlowLogger.instance) {
      FlowLogger.instance = new FlowLogger();
    }
    return FlowLogger.instance;
  }

  /**
   * 设置日志级别
   *
   * @param level 日志级别
   */
  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * 添加监听器
   *
   * @param listener 监听函数
   * @returns 取消监听的函数
   */
  addListener(listener: (log: any) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  /**
   * 记录日志
   *
   * @param level 日志级别
   * @param message 日志消息
   * @param nodeId 节点 ID
   * @param flowId 流程 ID
   * @param data 附加数据
   */
  log(level: LogLevel, message: string, nodeId?: string, flowId?: string, data?: any): void {
    // 检查日志级别
    const levelPriority = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };

    if (levelPriority[level] < levelPriority[this.logLevel]) {
      return;
    }

    const logEntry = {
      timestamp: Date.now(),
      level,
      nodeId,
      flowId,
      message,
      data,
    };

    this.logStore.push(logEntry);

    // 通知监听器
    for (const listener of this.listeners) {
      try {
        listener(logEntry);
      } catch (e) {
        console.error('Error in log listener:', e);
      }
    }

    // 控制台输出
    const levelToMethod = {
      [LogLevel.DEBUG]: 'debug',
      [LogLevel.INFO]: 'info',
      [LogLevel.WARN]: 'warn',
      [LogLevel.ERROR]: 'error',
    };

    const prefix = [
      new Date(logEntry.timestamp).toISOString(),
      level.toUpperCase(),
      nodeId ? `[${nodeId}]` : '',
      flowId ? `(${flowId})` : '',
    ]
      .filter(Boolean)
      .join(' ');

    console[levelToMethod[level] as 'debug' | 'info' | 'warn' | 'error'](
      `${prefix}: ${message}`,
      data || '',
    );
  }

  /**
   * 获取日志
   *
   * @returns 日志数组
   */
  getLogs(): any[] {
    return [...this.logStore];
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logStore = [];
  }

  /**
   * 记录调试级别日志
   *
   * @param message 日志消息
   * @param nodeId 节点 ID
   * @param flowId 流程 ID
   * @param data 附加数据
   */
  debug(message: string, nodeId?: string, flowId?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, nodeId, flowId, data);
  }

  /**
   * 记录信息级别日志
   *
   * @param message 日志消息
   * @param nodeId 节点 ID
   * @param flowId 流程 ID
   * @param data 附加数据
   */
  info(message: string, nodeId?: string, flowId?: string, data?: any): void {
    this.log(LogLevel.INFO, message, nodeId, flowId, data);
  }

  /**
   * 记录警告级别日志
   *
   * @param message 日志消息
   * @param nodeId 节点 ID
   * @param flowId 流程 ID
   * @param data 附加数据
   */
  warn(message: string, nodeId?: string, flowId?: string, data?: any): void {
    this.log(LogLevel.WARN, message, nodeId, flowId, data);
  }

  /**
   * 记录错误级别日志
   *
   * @param message 日志消息
   * @param nodeId 节点 ID
   * @param flowId 流程 ID
   * @param data 附加数据
   */
  error(message: string, nodeId?: string, flowId?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, nodeId, flowId, data);
  }
}

/**
 * 可观察的流程
 *
 * 包装 Flow 类，添加观察和日志记录功能。
 */
export class ObservableFlow {
  private flow: Flow;
  private logger = FlowLogger.getInstance();
  private id: string;
  private eventListeners: Map<string, Set<(event: string, data: any) => void>> = new Map();

  /**
   * 构造函数
   *
   * @param flow 流程
   * @param id 流程 ID
   */
  constructor(flow: Flow, id = `flow_${Date.now()}`) {
    this.flow = flow;
    this.id = id;

    this.logger.info(`创建可观察流程`, undefined, this.id);
  }

  /**
   * 监听事件
   *
   * @param event 事件名称
   * @param callback 回调函数
   * @returns 取消监听的函数
   */
  on(event: string, callback: (event: string, data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    const listeners = this.eventListeners.get(event)!;
    listeners.add(callback);

    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  /**
   * 发送事件
   *
   * @param event 事件名称
   * @param data 事件数据
   */
  emit(event: string, data: any): void {
    this.logger.debug(`事件: ${event}`, undefined, this.id, data);

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event, data);
        } catch (e) {
          this.logger.error(`事件监听器错误: ${e.message}`, undefined, this.id, {
            event,
            error: e,
          });
        }
      }
    }

    // 发送通用事件
    const anyListeners = this.eventListeners.get('*');
    if (anyListeners) {
      for (const listener of anyListeners) {
        try {
          listener(event, data);
        } catch (e) {
          this.logger.error(`通用事件监听器错误: ${e.message}`, undefined, this.id, {
            event,
            error: e,
          });
        }
      }
    }
  }

  /**
   * 执行流程
   *
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(options: any = {}): Promise<AnyData> {
    const startTime = Date.now();
    this.logger.info(`开始执行流程`, undefined, this.id, options);
    this.emit('flow:start', { options });

    try {
      // 包装 store 以添加事件
      const originalStore = options.store || new SharedStore();
      const wrappedStore = new Proxy(originalStore, {
        get: (target, prop) => {
          if (prop === 'set') {
            return (key: string, value: any) => {
              const result = target.set(key, value);
              this.emit('store:set', { key, value });
              return result;
            };
          }
          if (prop === 'get') {
            return (key: string) => {
              const value = target.get(key);
              this.emit('store:get', { key, value });
              return value;
            };
          }
          if (prop === 'delete') {
            return (key: string) => {
              const result = target.delete(key);
              this.emit('store:delete', { key });
              return result;
            };
          }
          return target[prop as keyof SharedStore];
        },
      });

      // 执行流程
      const result = await this.flow.execute({
        ...options,
        store: wrappedStore,
      });

      const duration = Date.now() - startTime;
      this.logger.info(`流程执行完成`, undefined, this.id, { duration });
      this.emit('flow:complete', { result, duration });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`流程执行错误: ${error.message}`, undefined, this.id, { error });
      this.emit('flow:error', { error, duration });
      throw error;
    }
  }
}

/**
 * 会话上下文管理器
 *
 * 管理对话上下文和状态，提供对话历史的分段和总结功能。
 */
export class ConversationManager {
  private store: SharedStore;
  private historyKey: string;
  private maxHistoryLength: number;

  /**
   * 构造函数
   *
   * @param store 共享存储
   * @param historyKey 历史记录在存储中的键
   * @param maxHistoryLength 最大历史记录长度
   */
  constructor(store: SharedStore, historyKey = 'conversation_history', maxHistoryLength = 100) {
    this.store = store;
    this.historyKey = historyKey;
    this.maxHistoryLength = maxHistoryLength;

    // 初始化历史记录
    if (!this.store.has(this.historyKey)) {
      this.store.set(this.historyKey, []);
    }
  }

  /**
   * 添加用户消息
   *
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 添加的消息
   */
  addUserMessage(content: string | object, metadata: object = {}): any {
    return this.addMessage({
      role: 'user',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: Date.now(),
      ...metadata,
    });
  }

  /**
   * 添加助手消息
   *
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 添加的消息
   */
  addAssistantMessage(content: string | object, metadata: object = {}): any {
    return this.addMessage({
      role: 'assistant',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: Date.now(),
      ...metadata,
    });
  }

  /**
   * 添加系统消息
   *
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 添加的消息
   */
  addSystemMessage(content: string | object, metadata: object = {}): any {
    return this.addMessage({
      role: 'system',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: Date.now(),
      ...metadata,
    });
  }

  /**
   * 添加工具消息
   *
   * @param toolName 工具名称
   * @param content 消息内容
   * @param toolCallId 工具调用 ID
   * @param metadata 元数据
   * @returns 添加的消息
   */
  addToolMessage(
    toolName: string,
    content: string | object,
    toolCallId: string,
    metadata: object = {},
  ): any {
    return this.addMessage({
      role: 'tool',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      tool_call_id: toolCallId,
      name: toolName,
      timestamp: Date.now(),
      ...metadata,
    });
  }

  /**
   * 添加消息
   *
   * @param message 消息
   * @returns 添加的消息
   */
  addMessage(message: any): any {
    const history = this.getHistory();

    // 添加消息
    history.push(message);

    // 如果超过最大长度，移除最旧的消息
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }

    // 更新存储
    this.store.set(this.historyKey, history);

    return message;
  }

  /**
   * 获取历史记录
   *
   * @returns 历史记录数组
   */
  getHistory(): any[] {
    return this.store.get(this.historyKey) || [];
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.store.set(this.historyKey, []);
  }

  /**
   * 获取最近的 N 条消息
   *
   * @param count 消息数量
   * @returns 最近的消息
   */
  getRecentMessages(count: number): any[] {
    const history = this.getHistory();
    return history.slice(-count);
  }

  /**
   * 获取消息历史以 LLM 可用的格式
   *
   * @returns 格式化的消息历史
   */
  getFormattedHistory(): any[] {
    const history = this.getHistory();

    // 格式化为标准消息格式
    return history.map((message) => {
      const formatted: any = {
        role: message.role,
        content: message.content,
      };

      // 添加工具相关字段
      if (message.role === 'tool') {
        formatted.tool_call_id = message.tool_call_id;
        if (message.name) {
          formatted.name = message.name;
        }
      }

      return formatted;
    });
  }

  /**
   * 获取按角色分组的消息
   *
   * @returns 按角色分组的消息
   */
  getMessagesByRole(): Record<string, any[]> {
    const history = this.getHistory();
    const result: Record<string, any[]> = {};

    for (const message of history) {
      const role = message.role;
      if (!result[role]) {
        result[role] = [];
      }
      result[role].push(message);
    }

    return result;
  }
}

/**
 * 错误处理和恢复工具
 */
export class ErrorRecoveryUtils {
  /**
   * 使用补偿策略创建节点
   *
   * @param originalNode 原始节点
   * @param fallbackFn 补偿函数
   * @returns 包装后的节点
   */
  static withFallback(
    originalNode: Node,
    fallbackFn: (error: Error, input: AnyData, store: SharedStore) => Promise<AnyData> | AnyData,
  ): Node {
    const originalId = originalNode.getId();
    const wrappedId = `${originalId}_with_fallback`;

    return new Node(wrappedId, async (input, store) => {
      try {
        // 尝试执行原始节点
        return await originalNode.execute(input, store);
      } catch (error) {
        // 记录错误
        const logger = FlowLogger.getInstance();
        logger.warn(`节点 ${originalId} 执行失败，使用补偿策略`, wrappedId, undefined, { error });

        // 执行补偿策略
        return await fallbackFn(error, input, store);
      }
    });
  }

  /**
   * 使用超时策略创建节点
   *
   * @param originalNode 原始节点
   * @param timeoutMs 超时时间(毫秒)
   * @param timeoutFn 超时处理函数
   * @returns 包装后的节点
   */
  static withTimeout(
    originalNode: Node,
    timeoutMs: number,
    timeoutFn: (input: AnyData, store: SharedStore) => Promise<AnyData> | AnyData,
  ): Node {
    const originalId = originalNode.getId();
    const wrappedId = `${originalId}_with_timeout`;

    return new Node(wrappedId, async (input, store) => {
      // 创建超时 Promise
      const timeoutPromise = new Promise<AnyData>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Node execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // 创建执行 Promise
      const executionPromise = originalNode.execute(input, store);

      try {
        // 使用 Promise.race 实现超时
        return await Promise.race([executionPromise, timeoutPromise]);
      } catch (error) {
        // 如果是超时错误
        if (error.message.includes('timed out')) {
          const logger = FlowLogger.getInstance();
          logger.warn(`节点 ${originalId} 执行超时`, wrappedId, undefined, { timeoutMs });

          // 执行超时处理函数
          return await timeoutFn(input, store);
        }

        // 其他错误直接抛出
        throw error;
      }
    });
  }

  /**
   * 使用重试策略创建节点
   *
   * @param originalNode 原始节点
   * @param maxRetries 最大重试次数
   * @param delayMs 重试延迟(毫秒)
   * @param shouldRetry 是否应该重试的条件函数
   * @returns 包装后的节点
   */
  static withRetry(
    originalNode: Node,
    maxRetries = 3,
    delayMs = 1000,
    shouldRetry: (error: Error) => boolean = () => true,
  ): Node {
    const originalId = originalNode.getId();
    const wrappedId = `${originalId}_with_retry`;

    return new Node(wrappedId, async (input, store) => {
      const logger = FlowLogger.getInstance();
      let lastError: Error;

      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          // 尝试执行原始节点
          const result = await originalNode.execute(input, store);

          // 如果是重试成功，记录日志
          if (attempt > 1) {
            logger.info(`节点 ${originalId} 重试成功，第 ${attempt - 1} 次重试`, wrappedId);
          }

          return result;
        } catch (error) {
          lastError = error;

          // 如果达到最大重试次数或不应该重试，抛出错误
          if (attempt > maxRetries || !shouldRetry(error)) {
            if (attempt > 1) {
              logger.error(
                `节点 ${originalId} 重试失败，已达到最大重试次数`,
                wrappedId,
                undefined,
                { error },
              );
            }
            throw error;
          }

          // 记录重试日志
          logger.warn(
            `节点 ${originalId} 执行失败，准备第 ${attempt} 次重试`,
            wrappedId,
            undefined,
            { error },
          );

          // 等待延迟
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      // 理论上不会执行到这里，但为了类型安全
      throw lastError!;
    });
  }
}
