import {
  Flow,
  Node,
  SharedStore,
  AgentNode,
  ToolNode,
  FlowBasedAgent,
  MockOpenAI as OpenAI,
} from '../src';

// 创建一个带有并行工具执行的 Agent 流程示例

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

async function main() {
  console.log('初始化并行工具执行流程示例...');

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
    
    当用户询问需要使用多个工具的问题时，请并行调用这些工具。
  `;

  // 创建共享存储
  const store = new SharedStore();
  store.set('messages', []);

  // 定义工具
  const tools = [
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

  store.set('tools', tools);

  // 创建用户输入处理节点
  const userInputNode = new Node('userInput', async (input, store) => {
    const messages = store.get('messages') || [];
    messages.push({ role: 'user', content: input.query });
    store.set('messages', messages);
    return input;
  });

  // 创建 Agent 节点
  const agentNode = new AgentNode('agent', client, systemPrompt, 0.7);

  // 创建工具调用解析节点
  const toolParserNode = new Node('toolParser', async (input, store) => {
    if (!input.tool_calls || input.tool_calls.length === 0) {
      return { content: input.content, tools: [] };
    }

    console.log(`🔧 解析工具调用: ${input.tool_calls.length} 个调用`);
    store.set('tool_calls', input.tool_calls);

    return {
      content: input.content,
      tool_calls: input.tool_calls,
    };
  });

  // 创建工具执行流程
  const toolFlow = new Flow();

  // 创建工具节点
  const searchNode = new ToolNode('search', 'search', tools[0], async (name, args) =>
    search(args.query),
  );

  const calculateNode = new ToolNode('calculate', 'calculate', tools[1], async (name, args) =>
    calculate(args.expression),
  );

  const weatherNode = new ToolNode('weather', 'getWeather', tools[2], async (name, args) =>
    getWeather(args.city),
  );

  // 创建工具结果收集节点
  const toolResultsNode = new Node('toolResults', async (input, store) => {
    const toolCalls = store.get('tool_calls') || [];
    const results = [];

    // 收集所有工具的结果
    for (const toolCall of toolCalls) {
      const name = toolCall.function.name;
      const result = store.get(`tool:${name}:result`);
      if (result) {
        results.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: name,
          content: result,
        });
      }
    }

    store.set('tool_results', results);
    return { tool_results: results, original_input: input };
  });

  // 添加工具节点到工具流
  toolFlow.addNode(searchNode);
  toolFlow.addNode(calculateNode);
  toolFlow.addNode(weatherNode);
  toolFlow.addNode(toolResultsNode);

  // 工具执行控制节点
  const toolExecutorNode = new Node('toolExecutor', async (input, store) => {
    if (!input.tool_calls || input.tool_calls.length === 0) {
      return input;
    }

    console.log('🔄 开始并行执行工具...');

    // 为每个工具调用准备输入
    for (const toolCall of input.tool_calls) {
      const name = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      // 将输入存储到共享存储中
      store.set(`tool:${name}:input`, {
        args,
        toolId: toolCall.id,
      });
    }

    // 创建连接并执行工具流
    const toolConnections = input.tool_calls.map((tc) => {
      const name = tc.function.name;
      // 根据工具名称连接到相应的工具节点
      return { from: 'input', to: name };
    });

    // 将所有工具节点连接到结果收集节点
    input.tool_calls.forEach((tc) => {
      const name = tc.function.name;
      toolConnections.push({ from: name, to: 'toolResults' });
    });

    // 使用子流程并行执行所有工具
    const subFlow = new Flow();

    // 重新添加工具节点
    subFlow.addNode(
      new ToolNode('search', 'search', tools[0], async (name, args) => search(args.query)),
    );
    subFlow.addNode(
      new ToolNode('calculate', 'calculate', tools[1], async (name, args) =>
        calculate(args.expression),
      ),
    );
    subFlow.addNode(
      new ToolNode('weather', 'getWeather', tools[2], async (name, args) => getWeather(args.city)),
    );
    subFlow.addNode(
      new Node('toolResults', async (input, store) => {
        const toolCalls = store.get('tool_calls') || [];
        const results = [];
        for (const toolCall of toolCalls) {
          const name = toolCall.function.name;
          const result = store.get(`tool:${name}:result`);
          if (result) {
            results.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: name,
              content: result,
            });
          }
        }
        store.set('tool_results', results);
        return { tool_results: results, original_input: input };
      }),
    );

    // 添加输入节点
    subFlow.addNode(
      new Node('input', async (_, store) => {
        return { timestamp: Date.now() };
      }),
    );

    // 添加连接
    toolConnections.forEach((conn) => {
      subFlow.connect(conn.from, conn.to);
    });

    // 执行子流程，并行执行工具
    await subFlow.execute({
      store,
      parallel: true,
    });

    return {
      content: input.content,
      tool_results: store.get('tool_results'),
    };
  });

  // 创建最终响应节点
  const finalResponseNode = new Node('finalResponse', async (input, store) => {
    // 如果有工具结果，将它们添加到消息历史中
    if (input.tool_results && input.tool_results.length > 0) {
      const messages = store.get('messages') || [];

      for (const result of input.tool_results) {
        messages.push(result);
        console.log(`🛠️ ${result.name} 结果: ${result.content}`);
      }

      store.set('messages', messages);

      // 再次调用 LLM 获取最终响应
      const finalResponse = await client.chat.completions.create({
        messages: [...messages],
        temperature: 0.7,
        model: 'gpt-3.5-turbo',
      });

      const content = finalResponse.choices[0].message.content;

      // 添加到消息历史
      messages.push({ role: 'assistant', content });
      store.set('messages', messages);

      console.log('\n🤖 助手最终回复: ' + content);
      return { content };
    }

    // 如果没有工具调用，直接使用 agent 的输出
    if (input.content) {
      const messages = store.get('messages') || [];
      messages.push({ role: 'assistant', content: input.content });
      store.set('messages', messages);
      console.log('\n🤖 助手: ' + input.content);
    }

    return input;
  });

  // 创建主流程
  const flow = new Flow();

  // 添加节点
  flow.addNode(userInputNode);
  flow.addNode(agentNode);
  flow.addNode(toolParserNode);
  flow.addNode(toolExecutorNode);
  flow.addNode(finalResponseNode);

  // 连接节点
  flow.connect('userInput', 'agent');
  flow.connect('agent', 'toolParser');
  flow.connect('toolParser', 'toolExecutor');
  flow.connect('toolExecutor', 'finalResponse');

  // 执行流程
  const query =
    process.argv[2] || '请同时告诉我北京的天气、21+35的计算结果，以及关于人工智能的一些信息';
  console.log('🧑 用户: ' + query);

  await flow.execute({
    input: { query },
    store,
  });

  console.log('\n流程执行完成!');
}

main().catch((err) => {
  console.error('错误:', err);
  process.exit(1);
});
