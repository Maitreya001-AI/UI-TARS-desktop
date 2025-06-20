# Agent Flow 使用指南

本指南将帮助你理解和使用 `@multimodal/agent-flow` 框架的核心功能。

## 基本概念

Agent Flow 框架建立在以下核心概念之上：

1. **Flow（流程）**：定义节点之间的连接和数据流向
2. **Node（节点）**：执行特定计算或处理逻辑的单元
3. **SharedStore（共享存储）**：在节点之间共享数据的机制

## 快速开始

### 方式1：使用 FlowBasedAgent 类

最简单的方式是使用 `FlowBasedAgent` 类，它提供了一个完整的代理实现：

```typescript
import { FlowBasedAgent } from '@multimodal/agent-flow';
import { OpenAI } from '@multimodal/model-provider';

// 创建 LLM 客户端
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 创建代理
const agent = new FlowBasedAgent(
  client,
  eventStreamProcessor,
  toolManager,
  {
    systemPrompt: '你是一个有用的助手',
    maxIterations: 5,
    temperature: 0.7
  }
);

// 运行代理
const result = await agent.run({
  input: '帮我查询天气',
  sessionId: 'user123',
});
```

### 方式2：使用底层节点构建自定义流程

如果你需要更高度定制的流程，可以使用底层组件来构建：

```typescript
import { Flow, Node, SharedStore, AgentNode } from '@multimodal/agent-flow';

// 创建流程
const flow = new Flow();

// 创建节点
const inputNode = new Node('input', async (input, store) => {
  // 处理输入
  store.set('message', input.message);
  return input;
});

const agentNode = new AgentNode('agent', llmClient, systemPrompt);

// 添加节点
flow.addNode(inputNode);
flow.addNode(agentNode);

// 连接节点
flow.connect('input', 'agent');

// 执行流程
const result = await flow.execute({
  input: { message: '你好' },
  store: new SharedStore()
});
```

## 高级功能

### 条件路由

使用 RouterNode 实现条件路由：

```typescript
import { RouterNode } from '@multimodal/agent-flow';

const router = new RouterNode('router');

// 添加路由条件
router.addRoute('route1', (input, store) => input.temp > 30);
router.addRoute('route2', (input, store) => input.temp <= 30);

// 设置默认路由
router.setDefaultRoute('default');

// 将路由节点添加到流程
flow.addNode(router);
```

### 错误处理和重试

使用 RetryNode 处理错误和重试：

```typescript
import { RetryNode } from '@multimodal/agent-flow';

const retryNode = new RetryNode('retry', 'targetNode', 3, 1000);
flow.addNode(retryNode);
```

### 并行执行

Flow 支持并行执行多个节点：

```typescript
await flow.execute({
  input,
  store,
  parallel: true
});
```

### 事件处理

使用 EventNode 发送事件：

```typescript
import { EventNode } from '@multimodal/agent-flow';

const eventNode = new EventNode('event', 'event_type', eventProcessor);
flow.addNode(eventNode);
```

## 与其他模块的集成

Agent Flow 可以与其他模块进行集成：

- **与 agent 模块集成**：FlowBasedAgent 可以作为 agent 模块的替代实现
- **与外部工具集成**：通过 ToolFlowAdapter 集成各种工具

## 最佳实践

1. **使用共享存储管理状态**：尽可能使用 SharedStore 来共享数据，避免通过节点返回值传递大量数据
2. **模块化设计**：将复杂流程拆分成多个子流程
3. **错误处理**：使用 RetryNode 和错误恢复机制增强稳定性
4. **并行处理**：合理利用并行执行能力提高性能
