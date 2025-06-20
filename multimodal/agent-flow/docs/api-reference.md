# Agent Flow API 参考

本文档提供了 `@multimodal/agent-flow` 框架的 API 参考。

## 核心模块

### Flow

`Flow` 类是整个框架的核心，它管理节点之间的连接和数据流向。

```typescript
import { Flow } from '@multimodal/agent-flow';

const flow = new Flow();
```

#### 方法

- **addNode(nodeOrId, nodeInstance?): Flow**
  
  添加一个节点到流程中。
  
  ```typescript
  // 方式1：直接添加节点
  flow.addNode(new Node('nodeId', processFn));
  
  // 方式2：通过ID和节点实例添加
  flow.addNode('nodeId', new Node('nodeId', processFn));
  ```

- **connect(from, to, options?): Flow**
  
  连接两个节点。
  
  ```typescript
  // 简单连接
  flow.connect('nodeA', 'nodeB');
  
  // 带条件的连接
  flow.connect('nodeA', 'nodeB', {
    condition: (data, store) => data.value > 10
  });
  ```

- **execute(options): Promise<any>**
  
  执行流程。
  
  ```typescript
  const result = await flow.execute({
    input: { query: 'Hello' },
    store: new SharedStore(),
    parallel: false,
    abortSignal: signal
  });
  ```

- **clone(): Flow**
  
  克隆流程。
  
  ```typescript
  const clonedFlow = flow.clone();
  ```

- **withAbortSignal(signal): Flow**
  
  设置中止信号。
  
  ```typescript
  flow.withAbortSignal(abortController.signal);
  ```

### Node

`Node` 类表示流程中的一个处理单元。

```typescript
import { Node } from '@multimodal/agent-flow';

const node = new Node('nodeId', async (input, store) => {
  // 处理逻辑
  return processedData;
});
```

#### 方法

- **getId(): string**
  
  获取节点ID。

- **process(input, store): Promise<any>**
  
  处理输入数据并返回输出。

### SharedStore

`SharedStore` 提供了节点之间共享数据的机制。

```typescript
import { SharedStore } from '@multimodal/agent-flow';

const store = new SharedStore();
```

#### 方法

- **set(key, value): void**
  
  设置存储中的值。
  
  ```typescript
  store.set('user', { name: 'Alice' });
  ```

- **get(key): any**
  
  获取存储中的值。
  
  ```typescript
  const user = store.get('user');
  ```

- **has(key): boolean**
  
  检查键是否存在。
  
  ```typescript
  if (store.has('user')) {
    // 处理用户数据
  }
  ```

- **delete(key): boolean**
  
  删除存储中的键。
  
  ```typescript
  store.delete('tempData');
  ```

- **clear(): void**
  
  清空存储。
  
  ```typescript
  store.clear();
  ```

- **append(key, value): void**
  
  将值追加到数组中。
  
  ```typescript
  store.append('messages', newMessage);
  ```

- **subscribe(key, callback): () => void**
  
  订阅键变更。
  
  ```typescript
  const unsubscribe = store.subscribe('counter', (value) => {
    console.log('Counter changed:', value);
  });
  
  // 取消订阅
  unsubscribe();
  ```

## 专用节点

### AgentNode

`AgentNode` 用于与 LLM 进行交互。

```typescript
import { AgentNode } from '@multimodal/agent-flow';

const agentNode = new AgentNode(
  'agent',
  llmClient,
  'You are a helpful assistant.',
  0.7, // temperature
  2000 // maxTokens
);
```

### RouterNode

`RouterNode` 用于根据条件进行路由。

```typescript
import { RouterNode } from '@multimodal/agent-flow';

const routerNode = new RouterNode('router');

routerNode.addRoute('routeA', (input, store) => input.type === 'A');
routerNode.addRoute('routeB', (input, store) => input.type === 'B');
routerNode.setDefaultRoute('default');
```

### ToolNode

`ToolNode` 用于执行工具调用。

```typescript
import { ToolNode } from '@multimodal/agent-flow';

const toolNode = new ToolNode(
  'tool',
  'calculator',
  toolDefinition,
  async (name, args) => {
    // 执行工具逻辑
    return result;
  }
);
```

### EventNode

`EventNode` 用于发送事件。

```typescript
import { EventNode } from '@multimodal/agent-flow';

const eventNode = new EventNode(
  'event',
  'user_message',
  eventProcessor
);
```

### RetryNode

`RetryNode` 用于处理重试逻辑。

```typescript
import { RetryNode } from '@multimodal/agent-flow';

const retryNode = new RetryNode(
  'retry',
  'targetNode',
  3, // 最大重试次数
  1000 // 重试延迟(毫秒)
);
```

## 代理实现

### FlowBasedAgent

`FlowBasedAgent` 提供了完整的基于流程的代理实现。

```typescript
import { FlowBasedAgent } from '@multimodal/agent-flow';

const agent = new FlowBasedAgent(
  llmClient,
  eventStream,
  toolManager,
  {
    systemPrompt: '你是一个有用的助手',
    maxIterations: 5,
    temperature: 0.7,
    maxTokens: 2000
  }
);
```

#### 方法

- **run(options): Promise<any>**
  
  运行代理。
  
  ```typescript
  const result = await agent.run({
    input: '请帮我查询天气',
    model: { id: 'gpt-4' },
    sessionId: 'user123'
  });
  ```

### ToolFlowAdapter

`ToolFlowAdapter` 用于将工具调用适配到流程框架。

```typescript
import { ToolFlowAdapter } from '@multimodal/agent-flow';

const adapter = new ToolFlowAdapter(toolManager, eventStream);
```

#### 方法

- **processToolCalls(toolCalls, sessionId, abortSignal?): Promise<ToolCallResult[]>**
  
  处理工具调用。
  
  ```typescript
  const results = await adapter.processToolCalls(toolCalls, 'session123');
  ```

## 工具与实用函数

### FlowLogger

`FlowLogger` 提供了日志记录功能。

```typescript
import { FlowLogger, LogLevel } from '@multimodal/agent-flow';

const logger = FlowLogger.getInstance();
logger.setLevel(LogLevel.INFO);

logger.info('Info message');
logger.debug('Debug message');
logger.warn('Warning message');
logger.error('Error message');
```

### ObservableFlow

`ObservableFlow` 为 Flow 添加了可观测性。

```typescript
import { ObservableFlow } from '@multimodal/agent-flow';

const flow = new Flow();
const observableFlow = new ObservableFlow(flow, {
  onNodeStart: (nodeId, input) => console.log(`Node ${nodeId} started`),
  onNodeComplete: (nodeId, output) => console.log(`Node ${nodeId} completed`),
  onNodeError: (nodeId, error) => console.error(`Node ${nodeId} failed:`, error)
});

await observableFlow.execute({ input });
```
