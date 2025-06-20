/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpenAI } from '@multimodal/model-provider';
import { 
  FlowBasedAgent, 
  SharedStore,
  AgentEventStream,
  Tool
} from '../src';

// 创建一个使用并行工具能力的代理示例

// 模拟的搜索工具
async function search(query: string): Promise<string> {
  console.log(`🔍 执行搜索: ${query}`);
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟网络延迟
  return `关于"${query}"的搜索结果: 找到了一些相关信息。这只是一个示例搜索结果，在实际应用中会返回真实数据。`;
}

// 模拟的计算工具
async function calculate(expression: string): Promise<string> {
  console.log(`🧮 执行计算: ${expression}`);
  await new Promise((resolve) => setTimeout(resolve, 800)); // 模拟处理延迟
  try {
    // eslint-disable-next-line no-eval
    const result = eval(expression);
    return `计算结果: ${expression} = ${result}`;
  } catch (e) {
    return `计算错误: ${e.message}`;
  }
}

// 模拟的天气查询工具
async function getWeather(city: string): Promise<string> {
  console.log(`🌤️ 查询天气: ${city}`);
  await new Promise((resolve) => setTimeout(resolve, 1200)); // 模拟API延迟
  const temps = {
    北京: '32°C',
    上海: '30°C',
    广州: '34°C',
    深圳: '33°C',
  };
  return `${city}的天气: ${temps[city] || '25°C'}, 晴朗`;
}

// 实现一个简单的事件流处理器
class SimpleEventStream implements AgentEventStream.Processor {
  createEvent(type: AgentEventStream.EventTypes, payload: any): AgentEventStream.Event {
    return { type, payload };
  }
  
  sendEvent(event: AgentEventStream.Event): void {
    console.log(`📣 事件: ${event.type}`, event.payload);
  }
}

// 实现一个简单的工具管理器
class SimpleToolManager {
  private tools: Tool[] = [];
  
  constructor() {
    // 注册工具
    this.registerTools();
  }
  
  registerTools() {
    this.tools = [
      {
        name: 'search',
        description: '搜索信息',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索查询' },
          },
          required: ['query'],
        },
      },
      {
        name: 'calculate',
        description: '进行数学计算',
        schema: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: '要计算的表达式' },
          },
          required: ['expression'],
        },
      },
      {
        name: 'getWeather',
        description: '查询城市的天气',
        schema: {
          type: 'object',
          properties: {
            city: { type: 'string', description: '城市名称' },
          },
          required: ['city'],
        },
      },
    ];
  }
  
  getTools(): Tool[] {
    return this.tools;
  }
  
  async executeTool(name: string, toolId: string, args: any): Promise<any> {
    console.log(`🔧 执行工具: ${name}, 参数:`, args);
    
    switch (name) {
      case 'search':
        return search(args.query);
      case 'calculate':
        return calculate(args.expression);
      case 'getWeather':
        return getWeather(args.city);
      default:
        throw new Error(`未知工具: ${name}`);
    }
  }
}

async function main() {
  console.log('初始化并行工具执行示例...');

  // 创建 LLM 客户端
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
  });

  // 系统提示
  const systemPrompt = `
    你是一个有用的AI助手，能够使用多种工具来帮助用户。
    可用的工具有:
    1. 搜索工具: 用于查询信息
    2. 计算工具: 用于进行数学计算
    3. 天气工具: 用于查询城市的天气
    
    当用户询问需要使用多个工具的问题时，你可以并行调用这些工具。
  `;

  // 创建简单的工具管理器和事件流处理器
  const toolManager = new SimpleToolManager();
  const eventStream = new SimpleEventStream();

  // 创建 FlowBasedAgent
  const agent = new FlowBasedAgent(
    client,
    eventStream,
    toolManager,
    {
      systemPrompt,
      maxIterations: 3,
      temperature: 0.7,
    }
  );

  // 执行代理
  const query = process.argv[2] || '请同时告诉我北京的天气、21+35的计算结果，以及关于人工智能的一些信息';
  console.log('🧑 用户: ' + query);

  try {
    const result = await agent.run({
      input: query,
      sessionId: `session_${Date.now()}`,
    });

    console.log('\n✅ 执行结果:', result.output);
  } catch (err) {
    console.error('❌ 错误:', err);
    process.exit(1);
  }
}

// 运行示例
main();
