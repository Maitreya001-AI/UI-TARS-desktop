/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpenAI } from '@multimodal/model-provider';
import {
  Flow,
  Node,
  SharedStore,
  AgentNode,
  MemoryNode,
  RouterNode,
  OutputParserNode,
  FlowLogger,
  ObservableFlow,
  ConversationManager,
  ContextManager,
  PromptBuilder,
  ErrorRecoveryUtils,
} from '../src';

/**
 * 高级代理示例 - 展示如何使用 Agent Flow 框架的所有高级功能
 *
 * 这个示例创建了一个具有以下特性的代理:
 * 1. 错误处理和恢复机制
 * 2. 会话管理和记忆功能
 * 3. 上下文管理和优化
 * 4. 结构化输出解析
 * 5. 路由和条件执行
 * 6. 日志记录和可观察性
 */

async function main() {
  console.log('初始化高级代理流程示例...');

  // 配置日志记录器
  const logger = FlowLogger.getInstance();
  logger.setLevel('info');

  logger.info('开始设置高级代理');

  // 创建 LLM 客户端
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
  });

  // 创建共享存储
  const store = new SharedStore();

  // 创建会话管理器
  const conversationManager = new ConversationManager(store);

  // 创建上下文管理器
  const contextManager = new ContextManager(store);

  // 创建提示构建器
  const promptBuilder = new PromptBuilder();
  promptBuilder
    .addSystemInstruction('你是一个先进的AI助手，专注于提供有帮助、准确且详细的回应。')
    .addRoleDefinition('你可以回答问题、提供信息、生成创意内容，并协助各种任务。')
    .addConstraints('避免提供有害、不准确或误导性的信息。如果不确定，坦率承认你不知道。')
    .addOutputFormat('当要求提供结构化输出时，使用JSON格式。');

  // 设置基本的系统提示
  const systemPrompt = promptBuilder.build();

  // 构建基本流程
  const flow = new Flow();

  // 创建输入处理节点
  const inputNode = new Node('input', async (input, store) => {
    logger.info('处理用户输入', 'input', undefined, input);

    // 添加到会话历史
    conversationManager.addUserMessage(input.query);

    // 添加到上下文
    contextManager.addContext({
      content: input.query,
      role: 'user',
      source: 'user_input',
    });

    return {
      query: input.query,
      timestamp: Date.now(),
    };
  });

  // 创建记忆检索节点
  const memoryNode = new MemoryNode('memory', 'memory_store');

  // 创建上下文准备节点
  const contextNode = new Node('context_prep', async (input, store) => {
    logger.info('准备上下文', 'context_prep');

    // 获取历史消息并设置提示
    const messageHistory = conversationManager.getFormattedHistory();
    store.set('message_history', messageHistory);

    // 获取当前上下文并添加到提示
    const currentContext = contextManager.buildFormattedContext();
    if (currentContext) {
      promptBuilder.addContext(currentContext);
    }

    // 添加用户查询
    promptBuilder.addUserQuery(input.query);

    // 生成最终提示
    const finalPrompt = promptBuilder.build();
    store.set('final_prompt', finalPrompt);

    return {
      ...input,
      prompt: finalPrompt,
      messageHistory,
    };
  });

  // 创建路由节点
  const routerNode = new RouterNode('router')
    .addRoute(
      'structured_output',
      (input) =>
        input.query.includes('结构化') ||
        input.query.includes('JSON') ||
        input.query.includes('格式化'),
    )
    .addRoute(
      'memory_operation',
      (input) =>
        input.query.includes('记住') ||
        input.query.includes('回忆') ||
        input.query.includes('之前'),
    )
    .setDefaultRoute('general');

  // 创建代理节点 (使用错误恢复包装)
  const rawAgentNode = new AgentNode('agent', client, systemPrompt, 0.7);
  const agentNode = ErrorRecoveryUtils.withRetry(rawAgentNode, 2, 1000);

  // 创建输出解析节点
  const outputParserNode = new OutputParserNode('output_parser');

  // 创建记忆操作节点
  const memoryOpNode = new Node('memory_op', async (input, store) => {
    logger.info('执行记忆操作', 'memory_op');

    if (input.content.toLowerCase().includes('记住')) {
      // 提取需要记住的内容
      const contentMatch = input.content.match(/记住(.+)/) || [];
      const itemToRemember = contentMatch[1]?.trim();

      if (itemToRemember) {
        return {
          operation: 'add',
          item: {
            content: itemToRemember,
            type: 'memory',
          },
          response: `我已经记住了: ${itemToRemember}`,
        };
      }
    } else if (
      input.content.toLowerCase().includes('回忆') ||
      input.content.toLowerCase().includes('之前')
    ) {
      // 检索记忆
      return {
        operation: 'retrieve',
        query: input.query,
        response: '让我回想一下我们之前讨论的内容...',
      };
    }

    return input;
  });

  // 创建响应格式化节点
  const responseFormatterNode = new Node('response_formatter', async (input, store) => {
    logger.info('格式化响应', 'response_formatter');

    let formattedResponse = '';

    if (input.parsed) {
      // 结构化输出
      formattedResponse =
        '以下是结构化结果:\n```json\n' + JSON.stringify(input.parsed, null, 2) + '\n```';
    } else if (input.response) {
      // 已经准备好的响应
      formattedResponse = input.response;
    } else if (input.content) {
      // LLM 输出
      formattedResponse =
        typeof input.content === 'string' ? input.content : JSON.stringify(input.content);
    } else {
      // 后备响应
      formattedResponse = '我理解你的请求，但不确定如何回应。能请你换个方式描述吗？';
    }

    // 添加到会话历史
    conversationManager.addAssistantMessage(formattedResponse);

    return {
      ...input,
      formattedResponse,
    };
  });

  // 创建输出节点
  const outputNode = new Node('output', async (input, store) => {
    logger.info('生成最终输出', 'output');

    console.log('\n🤖 助手: ' + input.formattedResponse);

    return {
      response: input.formattedResponse,
      sessionId: store.get('sessionId'),
      timestamp: Date.now(),
    };
  });

  // 添加所有节点
  flow.addNode(inputNode);
  flow.addNode(memoryNode);
  flow.addNode(contextNode);
  flow.addNode(routerNode);
  flow.addNode(agentNode);
  flow.addNode(outputParserNode);
  flow.addNode(memoryOpNode);
  flow.addNode(responseFormatterNode);
  flow.addNode(outputNode);

  // 主路径连接
  flow.connect('input', 'context_prep');
  flow.connect('context_prep', 'router');

  // 路由连接
  flow.connect('router', 'agent');

  // 结构化输出路径
  flow.connect('agent', 'output_parser', {
    condition: (data) => data.route === 'structured_output',
  });
  flow.connect('output_parser', 'response_formatter');

  // 记忆操作路径
  flow.connect('agent', 'memory_op', {
    condition: (data) => data.route === 'memory_operation',
  });
  flow.connect('memory_op', 'memory');
  flow.connect('memory', 'response_formatter');

  // 一般响应路径
  flow.connect('agent', 'response_formatter', {
    condition: (data) => data.route === 'general',
  });

  // 最终输出
  flow.connect('response_formatter', 'output');

  // 创建可观察流程
  const observableFlow = new ObservableFlow(flow, 'advanced_agent');

  // 添加事件监听
  observableFlow.on('flow:start', () => {
    console.log('🚀 代理流程开始执行');
  });

  observableFlow.on('flow:complete', (_, data) => {
    console.log(`✅ 代理流程完成，耗时: ${data.duration}ms\n`);
  });

  // 设置会话 ID
  store.set('sessionId', `session_${Date.now()}`);

  // 执行流程
  const query =
    process.argv[2] || '你能告诉我什么是机器学习，并以JSON格式列出三个主要的机器学习方法吗？';
  console.log('🧑 用户: ' + query);

  await observableFlow.execute({
    input: { query },
    store,
  });

  // 再次执行，测试记忆功能
  if (!process.argv[2]) {
    console.log('\n🧑 用户: 能帮我记住明天下午3点要开会吗？');

    await observableFlow.execute({
      input: { query: '能帮我记住明天下午3点要开会吗？' },
      store,
    });

    console.log('\n🧑 用户: 你能告诉我你之前记住的事情吗？');

    await observableFlow.execute({
      input: { query: '你能告诉我你之前记住的事情吗？' },
      store,
    });
  }
}

main().catch((err) => {
  console.error('错误:', err);
  process.exit(1);
});
