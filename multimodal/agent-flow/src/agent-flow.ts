/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentEventStream,
  Tool,
  ToolCallResult,
  ChatCompletionMessageToolCall,
  ChatCompletionMessageParam,
  AgentRunOptions,
} from '@multimodal/agent-interface';
import { OpenAI } from '@multimodal/model-provider';
import { Flow } from './flow';
import { Node } from './node';
import { SharedStore } from './shared-store';
import { ToolFlowAdapter } from './tool-adapter';

/**
 * AgentNode - 代理节点
 *
 * 用于与 LLM 进行交互的节点。
 */
export class AgentNode extends Node {
  /**
   * 构造函数
   *
   * @param id 节点 ID
   * @param llmClient LLM 客户端
   * @param systemPrompt 系统提示
   * @param temperature 温度参数
   * @param maxTokens 最大 token 数量
   */
  constructor(
    id: string,
    private llmClient: OpenAI,
    private systemPrompt: string,
    private temperature: number = 0.7,
    private maxTokens?: number,
  ) {
    super(id, async (input, store) => {
      const messages = this.buildMessages(input, store);

      // 调用 LLM
      const completion = await this.llmClient.chat.completions.create({
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        model: input.model || store.get('model'),
        tools: store.get('tools') || [],
      });

      const response = completion.choices[0].message;

      // 将响应存入存储
      store.set('last_response', response);
      store.append('message_history', response);

      return response;
    });
  }

  /**
   * 构建消息
   *
   * @param input 输入数据
   * @param store 共享存储
   * @returns 消息数组
   */
  private buildMessages(input: any, store: SharedStore): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

    // 添加系统提示
    messages.push({
      role: 'system',
      content: this.systemPrompt,
    });

    // 添加历史消息
    const messageHistory = store.get('message_history');
    if (Array.isArray(messageHistory) && messageHistory.length > 0) {
      messages.push(...messageHistory);
    }

    // 添加输入消息
    if (input.message) {
      messages.push(input.message);
    }

    return messages;
  }
}

/**
 * AgentFlow - 代理流程
 *
 * 使用 Pocket Flow 实现代理循环执行逻辑。
 */
export class AgentFlow {
  private flow: Flow;
  private store: SharedStore;
  private toolFlowAdapter: ToolFlowAdapter;
  private maxIterations: number;

  /**
   * 构造函数
   *
   * @param llmClient LLM 客户端
   * @param eventStream 事件流处理器
   * @param toolManager 工具管理器
   * @param options 选项
   */
  constructor(
    private llmClient: OpenAI,
    private eventStream: AgentEventStream.Processor,
    toolManager: any,
    options: {
      systemPrompt?: string;
      maxIterations?: number;
      temperature?: number;
      maxTokens?: number;
    } = {},
  ) {
    this.store = new SharedStore();
    this.toolFlowAdapter = new ToolFlowAdapter(toolManager, eventStream);
    this.maxIterations = options.maxIterations || 10;

    const systemPrompt = options.systemPrompt || 'You are a helpful assistant.';
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens;

    this.flow = this.buildAgentFlow(systemPrompt, temperature, maxTokens);
  }

  /**
   * 构建代理流程
   *
   * @param systemPrompt 系统提示
   * @param temperature 温度参数
   * @param maxTokens 最大 token 数量
   * @returns 代理流程
   */
  private buildAgentFlow(systemPrompt: string, temperature: number, maxTokens?: number): Flow {
    const flow = new Flow();

    // 初始化节点
    const initNode = new Node('init', async (input, store) => {
      store.set('iteration', 0);
      store.set('message_history', []);
      store.set('completed', false);
      store.set('tools', input.tools || []);
      store.set('model', input.model);
      store.set('sessionId', input.sessionId || `session_${Date.now()}`);

      // 创建用户消息
      const userMessage = {
        role: 'user',
        content: input.input || input.message,
      };

      store.append('message_history', userMessage);

      // 创建用户消息事件
      const userMessageEvent = this.eventStream.createEvent('user_message', {
        content: userMessage.content,
        role: userMessage.role,
      });

      this.eventStream.sendEvent(userMessageEvent);

      // 创建代理运行开始事件
      const runStartEvent = this.eventStream.createEvent('agent_run_start', {
        input: userMessage.content,
        options: input.options || {},
      });

      this.eventStream.sendEvent(runStartEvent);

      return {
        message: userMessage,
        options: input.options || {},
      };
    });

    // 代理思考节点
    const agentNode = new AgentNode('agent', this.llmClient, systemPrompt, temperature, maxTokens);

    // 处理代理响应节点
    const processResponseNode = new Node('process_response', async (input, store) => {
      // 递增迭代次数
      const iteration = (store.get('iteration') || 0) + 1;
      store.set('iteration', iteration);

      // 创建代理消息事件
      const content =
        typeof input.content === 'string' ? input.content : JSON.stringify(input.content);

      const assistantMessageEvent = this.eventStream.createEvent('assistant_message', {
        content,
        role: 'assistant',
      });

      this.eventStream.sendEvent(assistantMessageEvent);

      // 检查是否有工具调用
      if (input.tool_calls && input.tool_calls.length > 0) {
        store.set('tool_calls', input.tool_calls);
        return {
          needsTools: true,
          tool_calls: input.tool_calls,
        };
      }

      // 如果没有工具调用，则完成
      store.set('completed', true);
      return {
        needsTools: false,
        finalResponse: content,
      };
    });

    // 工具执行节点
    const toolExecutionNode = new Node('tool_execution', async (input, store) => {
      if (!input.needsTools) {
        return input;
      }

      const sessionId = store.get('sessionId');
      const results = await this.toolFlowAdapter.processToolCalls(input.tool_calls, sessionId);

      // 创建工具结果消息
      const toolMessages: ChatCompletionMessageParam[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const toolCall = input.tool_calls[i];

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.content,
        });
      }

      // 添加到消息历史
      for (const message of toolMessages) {
        store.append('message_history', message);
      }

      return {
        toolResults: results,
        toolMessages,
        needsTools: false,
      };
    });

    // 循环检查节点
    const loopCheckNode = new Node('loop_check', async (input, store) => {
      const iteration = store.get('iteration') || 0;
      const completed = store.get('completed') || false;

      if (completed) {
        // 创建代理运行结束事件
        const runEndEvent = this.eventStream.createEvent('agent_run_end', {
          status: 'completed',
          output: input.finalResponse || '',
        });

        this.eventStream.sendEvent(runEndEvent);

        const finalAnswerEvent = this.eventStream.createEvent('final_answer', {
          content: input.finalResponse || '',
          isDeepResearch: false,
        });

        this.eventStream.sendEvent(finalAnswerEvent);

        return {
          completed: true,
          output: input.finalResponse || '',
        };
      }

      if (iteration >= this.maxIterations) {
        // 创建代理运行结束事件(循环次数达到上限)
        const runEndEvent = this.eventStream.createEvent('agent_run_end', {
          status: 'max_iterations',
          output: 'Maximum number of iterations reached',
        });

        this.eventStream.sendEvent(runEndEvent);

        return {
          completed: true,
          output: 'Maximum number of iterations reached',
        };
      }

      // 需要继续执行
      return {
        completed: false,
        continueExecution: true,
      };
    });

    // 添加所有节点
    flow.addNode(initNode);
    flow.addNode(agentNode);
    flow.addNode(processResponseNode);
    flow.addNode(toolExecutionNode);
    flow.addNode(loopCheckNode);

    // 连接节点
    flow.connect('init', 'agent');
    flow.connect('agent', 'process_response');
    flow.connect('process_response', 'tool_execution');
    flow.connect('tool_execution', 'loop_check');

    // 循环连接(当需要继续时，返回到代理节点)
    flow.connect('loop_check', 'agent', {
      condition: (data) => !data.completed && data.continueExecution,
    });

    return flow;
  }

  /**
   * 运行代理
   *
   * @param options 运行选项
   * @returns 运行结果
   */
  async run(options: AgentRunOptions): Promise<any> {
    // 获取工具
    const tools = this.getTools();

    // 初始化输入
    const input = {
      input: options.input,
      tools: tools,
      options: options,
      model: options.model?.id || 'gpt-4',
      sessionId: options.sessionId || `session_${Date.now()}`,
    };

    // 执行流程
    const result = await this.flow.execute({
      input,
      store: this.store,
    });

    // 返回结果
    return result;
  }

  /**
   * 获取工具列表
   *
   * @returns 工具列表
   */
  private getTools(): Tool[] {
    // 尝试从工具适配器获取工具
    if (this.toolFlowAdapter && (this.toolFlowAdapter as any).toolManager) {
      const toolManager = (this.toolFlowAdapter as any).toolManager;

      if (toolManager.getTools && typeof toolManager.getTools === 'function') {
        return toolManager.getTools();
      }
    }

    return [];
  }
}
