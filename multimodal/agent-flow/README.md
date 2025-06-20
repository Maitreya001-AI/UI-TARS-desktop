# @multimodal/agent-flow

一个基于 Pocket Flow 图形化计算模型的轻量级 Agent 框架。

## 特点

- **极简设计**：核心代码仅约 100 行
- **图形化计算模型**：使用节点和流的概念组织代码
- **共享存储**：使用共享存储机制在节点间传递数据
- **批处理支持**：简化批量数据处理
- **专门节点**：为常见 AI 操作提供特殊节点
- **错误处理**：内置故障恢复和重试机制
- **上下文管理**：高效处理和优化提示与上下文
- **可观测性**：全面的日志记录和跟踪能力
- **与现有 Agent 架构集成**：可与 @multimodal/agent 无缝集成

## 核心概念

- **Node**：计算单元，接收输入并生成输出
- **Flow**：定义节点间的连接和数据流向
- **SharedStore**：节点间共享数据的机制
- **ContextManager**：管理和优化 LLM 上下文
- **MemoryNode**：处理持久化记忆和检索
- **RouterNode**：实现条件路由逻辑
- **ObservableFlow**：添加日志和可观测性
- **Batch**：批量处理数据的工具

## 设计模式支持

- **Agent**：构建自主代理
- **Workflow**：定义复杂工作流
- **RAG**：检索增强生成
- **MapReduce**：并行数据处理
- **MultiAgent**：多代理协作
- **ErrorRecovery**：错误处理和故障恢复
- **StructuredOutput**：结构化输出解析

## 快速开始

```typescript
import { Node, Flow, SharedStore } from '@multimodal/agent-flow';

// 创建节点
const inputNode = new Node('input', async (store) => {
  return { message: '你好，世界！' };
});

const processingNode = new Node('processing', async (data, store) => {
  return { message: data.message + ' 处理完成！' };
});

const outputNode = new Node('output', async (data, store) => {
  console.log(data.message);
  store.set('result', data.message);
});

// 创建并执行流
const flow = new Flow()
  .addNode(inputNode)
  .addNode(processingNode)
  .addNode(outputNode)
  .connect('input', 'processing')
  .connect('processing', 'output');

// 创建共享存储
const store = new SharedStore();

// 执行流
await flow.execute({ store });

// 获取结果
console.log(store.get('result')); // 你好，世界！处理完成！
```

## 高级功能

### 专门节点类型

框架提供了多种专门节点类型，以简化常见的 AI 代理操作：

```typescript
import { 
  MemoryNode,         // 用于处理记忆和检索
  RouterNode,         // 用于条件路由
  OutputParserNode,   // 用于结构化输出解析
  RetryNode           // 用于重试逻辑
} from '@multimodal/agent-flow';

// 示例: 记忆节点
const memoryNode = new MemoryNode('memory', 'conversation_history');

// 示例: 路由节点
const routerNode = new RouterNode('router')
  .addRoute('search', (input) => input.query.includes('搜索'))
  .addRoute('calculate', (input) => input.query.includes('计算'))
  .setDefaultRoute('conversation');
```

### 错误处理和恢复

框架内置了强大的错误处理和恢复机制：

```typescript
import { Node, ErrorRecoveryUtils } from '@multimodal/agent-flow';

// 创建原始节点
const apiNode = new Node('api_call', async (input, store) => {
  // 可能失败的 API 调用
  const result = await someApiCall(input);
  return result;
});

// 添加重试逻辑
const nodeWithRetry = ErrorRecoveryUtils.withRetry(
  apiNode,      // 原始节点
  3,            // 最大重试次数
  1000,         // 重试延迟(毫秒)
  (error) => error.code !== 'FATAL'  // 重试条件
);

// 添加超时处理
const nodeWithTimeout = ErrorRecoveryUtils.withTimeout(
  nodeWithRetry,
  5000,        // 超时时间(毫秒)
  (input, store) => {
    return { error: '操作超时', fallback: true };
  }
);
```

### 上下文和提示管理

优化 LLM 输入的上下文和提示管理：

```typescript
import { ContextManager, PromptBuilder } from '@multimodal/agent-flow';

// 创建上下文管理器
const contextManager = new ContextManager(store);

// 添加上下文
contextManager.addContext({
  content: '用户是一位软件开发者，对 AI 和机器学习感兴趣。',
  source: 'user_profile'
});

// 创建提示构建器
const promptBuilder = new PromptBuilder()
  .addSystemInstruction('你是一个专业、友好的助手。')
  .addRoleDefinition('你擅长解释技术概念和提供代码示例。')
  .addContext(contextManager.buildFormattedContext())
  .addUserQuery('什么是神经网络？');

// 获取完整提示
const fullPrompt = promptBuilder.build();
```

### 可观测性和日志

完整的日志和事件跟踪能力：

```typescript
import { Flow, FlowLogger, ObservableFlow } from '@multimodal/agent-flow';

// 配置日志记录器
const logger = FlowLogger.getInstance();
logger.setLevel('info');

// 创建可观察流程
const observableFlow = new ObservableFlow(flow, 'my_agent');

// 添加事件监听
observableFlow.on('flow:start', () => {
  console.log('流程开始执行');
});

observableFlow.on('flow:complete', (_, data) => {
  console.log(`流程完成，耗时: ${data.duration}ms`);
});

// 执行可观察流程
await observableFlow.execute({ input, store });
```

## 示例

框架包含三个完整的示例应用程序：

- `simple-agent.ts`：基本代理功能示例
- `parallel-tools.ts`：并行工具执行示例
- `advanced-agent.ts`：展示所有高级特性的综合示例

## 与现有 Agent 架构集成

该框架设计为可与现有的 @multimodal/agent 架构无缝集成，特别是在工具处理和状态管理方面。

## 许可证

Apache-2.0
