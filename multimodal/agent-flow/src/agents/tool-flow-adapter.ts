import {
  ChatCompletionMessageToolCall,
  Tool,
  ToolCallResult,
  AgentEventStream,
} from '../interfaces';
import { Node } from '../core/node';
import { Flow } from '../core/flow';
import { SharedStore } from '../core/shared-store';
import { EventNode } from '../nodes/event-node';
import { ToolNode } from '../nodes/tool-node';

export class ToolFlowAdapter {
  constructor(
    public toolManager: any,
    private eventStream: AgentEventStream.Processor,
  ) {}

  buildToolFlow(
    toolCalls: ChatCompletionMessageToolCall[],
    sessionId: string,
    abortSignal?: AbortSignal,
  ): Flow {
    const flow = new Flow();
    const store = new SharedStore();

    // 创建一个起始节点来设置初始数据
    flow.addNode(
      new Node('start', async (_, store) => {
        store.set('toolCallResults', []);
        return { sessionId };
      }),
    );

    // 为每个工具调用创建节点
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const toolName = toolCall.function.name;
      const toolId = toolCall.id;
      const args = JSON.parse(toolCall.function.arguments || '{}');

      // 工具调用事件节点
      const toolCallEventNode = new EventNode(
        `${toolId}_call_event`,
        'tool_call',
        this.eventStream,
      );

      // 工具执行节点
      const toolExecuteNode = new ToolNode(
        `${toolId}_execute`,
        toolName,
        this.getToolDefinition(toolName),
        this.executeToolWrapper.bind(this),
      );

      // 工具结果事件节点
      const toolResultEventNode = new EventNode(
        `${toolId}_result_event`,
        'tool_result',
        this.eventStream,
      );

      // 工具结果收集节点
      const collectResultNode = new Node(`${toolId}_collect`, async (input, store) => {
        const toolCallResults = store.get('toolCallResults') || [];

        const result: ToolCallResult = {
          toolCallId: toolId,
          toolName: toolName,
          content: input.result,
        };

        toolCallResults.push(result);
        store.set('toolCallResults', toolCallResults);

        return result;
      });

      // 添加节点
      flow.addNode(toolCallEventNode);
      flow.addNode(toolExecuteNode);
      flow.addNode(toolResultEventNode);
      flow.addNode(collectResultNode);

      // 连接节点
      flow.connect('start', `${toolId}_call_event`);
      flow.connect(`${toolId}_call_event`, `${toolId}_execute`);
      flow.connect(`${toolId}_execute`, `${toolId}_result_event`);
      flow.connect(`${toolId}_result_event`, `${toolId}_collect`);
    }

    if (abortSignal) {
      flow.withAbortSignal(abortSignal);
    }

    return flow;
  }

  async processToolCalls(
    toolCalls: ChatCompletionMessageToolCall[],
    sessionId: string,
    abortSignal?: AbortSignal,
  ): Promise<ToolCallResult[]> {
    // 构建工具流
    const flow = this.buildToolFlow(toolCalls, sessionId, abortSignal);

    // 创建共享存储
    const store = new SharedStore();

    // 执行工具流
    await flow.execute({
      input: { sessionId, toolCalls },
      store,
      parallel: false,
      abortSignal,
    });

    // 返回工具调用结果
    return store.get('toolCallResults') || [];
  }

  private getToolDefinition(toolName: string): Tool {
    // 尝试从工具管理器获取工具定义
    if (this.toolManager.getTools && typeof this.toolManager.getTools === 'function') {
      const tools = this.toolManager.getTools();
      const tool = tools.find((t: Tool) => t.name === toolName);
      if (tool) {
        return tool;
      }
    }

    if (this.toolManager.getTool && typeof this.toolManager.getTool === 'function') {
      const tool = this.toolManager.getTool(toolName);
      if (tool) {
        return tool;
      }
    }

    // 返回一个空的工具定义
    return {
      name: toolName,
      description: 'Unknown tool',
      schema: {},
    };
  }

  private async executeToolWrapper(name: string, args: any, toolId?: string): Promise<any> {
    // 尝试从工具管理器执行工具
    if (this.toolManager.executeTool && typeof this.toolManager.executeTool === 'function') {
      return this.toolManager.executeTool(name, toolId || '', args);
    }

    throw new Error(`Cannot execute tool: ${name}`);
  }
}
