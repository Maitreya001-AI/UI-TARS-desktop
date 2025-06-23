import { Flow, Node, SharedStore, ToolNode, MockOpenAI as OpenAI } from '../src';

// 创建一个简化的并行工具执行示例

async function main() {
  console.log('初始化并行工具执行流程示例...');

  // 创建共享存储
  const store = new SharedStore();

  // 定义工具函数
  const searchTool = async (query: string): Promise<string> => {
    console.log(`🔍 执行搜索: ${query}`);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟网络延迟
    return `搜索结果: 关于"${query}"的信息`;
  };

  const calculateTool = async (expression: string): Promise<string> => {
    console.log(`🧮 执行计算: ${expression}`);
    await new Promise((resolve) => setTimeout(resolve, 800)); // 模拟处理延迟
    const result = 10 + 25; // 简化计算
    return `计算结果: ${expression} = ${result}`;
  };

  const weatherTool = async (city: string): Promise<string> => {
    console.log(`🌤️ 查询天气: ${city}`);
    await new Promise((resolve) => setTimeout(resolve, 1200)); // 模拟API延迟
    return `${city}的天气: 32°C, 晴朗`;
  };

  // 创建主流程
  const flow = new Flow();

  // 创建节点
  const startNode = new Node('start', async (_, store) => {
    console.log('开始执行并行工具流程');
    store.set('results', []);
    return { timestamp: Date.now() };
  });

  // 创建工具节点
  const searchNode = new ToolNode(
    'search',
    'search',
    { name: 'search', description: '搜索信息', schema: {} },
    async () => searchTool('人工智能'),
  );

  const calculateNode = new ToolNode(
    'calculate',
    'calculate',
    { name: 'calculate', description: '执行计算', schema: {} },
    async () => calculateTool('10 + 25'),
  );

  const weatherNode = new ToolNode(
    'weather',
    'weather',
    { name: 'weather', description: '查询天气', schema: {} },
    async () => weatherTool('北京'),
  );

  // 创建结果收集节点
  const collectNode = new Node('collect', async (input, store) => {
    const results = store.get('results') || [];
    results.push(input);
    store.set('results', results);

    return input;
  });

  // 创建汇总节点
  const summaryNode = new Node('summary', async (_, store) => {
    const results = store.get('results') || [];
    console.log('\n📋 并行工具执行结果汇总:');

    for (const result of results) {
      console.log(`- ${result.result}`);
    }

    return { success: true, count: results.length };
  });

  // 添加节点
  flow.addNode(startNode);
  flow.addNode(searchNode);
  flow.addNode(calculateNode);
  flow.addNode(weatherNode);
  flow.addNode(collectNode);
  flow.addNode(summaryNode);

  // 连接节点 - 从起始节点到各个工具节点的连接
  flow.connect('start', 'search');
  flow.connect('start', 'calculate');
  flow.connect('start', 'weather');

  // 从工具节点到收集节点的连接
  flow.connect('search', 'collect');
  flow.connect('calculate', 'collect');
  flow.connect('weather', 'collect');

  // 从收集节点到汇总节点的连接
  flow.connect('collect', 'summary');

  // 执行流程，启用并行执行
  console.log('开始并行执行工具...\n');

  const result = await flow.execute({
    store,
    parallel: true, // 启用并行执行
  });

  console.log(`\n✅ 执行完成! 成功执行了 ${result.count} 个工具`);
}

// 运行示例
main().catch((err) => {
  console.error('❌ 错误:', err);
});
