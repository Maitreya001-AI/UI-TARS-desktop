import { Flow, Node, SharedStore, AgentNode, FlowBasedAgent, MockOpenAI as OpenAI } from '../src';

// 创建一个简单的 Agent 流程示例

async function main() {
  console.log('初始化简单 Agent 流程示例...');

  // 创建模拟 LLM 客户端
  const client = new OpenAI({
    apiKey: 'mock-api-key', // 模拟API密钥
    baseURL: 'https://api.openai.com/v1', // 默认基础URL
  });

  // 系统提示
  const systemPrompt = `
    你是一个有用的AI助手。请简洁明了地回答用户的问题。
  `;

  // 创建共享存储
  const store = new SharedStore();
  store.set('messages', []);
  store.set('tools', []);

  // 创建用户输入处理节点
  const userInputNode = new Node('userInput', async (input, store) => {
    const messages = store.get('messages') || [];
    messages.push({ role: 'user', content: input.query });
    store.set('messages', messages);
    return input;
  });

  // 创建 Agent 节点
  const agentNode = new AgentNode('agent', client, systemPrompt, 0.7, 2000);

  // 创建响应处理节点
  const responseNode = new Node('response', async (input, store) => {
    const messages = store.get('messages') || [];

    if (input.content) {
      messages.push({ role: 'assistant', content: input.content });
      store.set('messages', messages);
      console.log('\n🤖 助手: ' + input.content);
    }

    return input;
  });

  // 创建流程
  const flow = new Flow();

  // 添加节点
  flow.addNode(userInputNode);
  flow.addNode(agentNode);
  flow.addNode(responseNode);

  // 连接节点
  flow.connect('userInput', 'agent');
  flow.connect('agent', 'response');

  // 执行流程
  console.log('🧑 用户: Hello! How are you?');
  await flow.execute({
    input: {
      query: 'Hello! How are you?',
    },
    store,
  });

  console.log('\n流程执行完成!');
}

main().catch((err) => {
  console.error('错误:', err);
});
