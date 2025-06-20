# Agent Flow 模块重构说明

## 重构目标

重构目标是将原来过于集中的代码拆分成职责单一、相互独立的组件，提高代码的可读性和可维护性。

## 重构内容

### 1. 节点组件重构

将原来集中在少数文件中的节点类移动到了专门的`nodes`目录：

- **AgentNode**: 从`agent-flow.ts`移动到`nodes/agent-node.ts`
- **ToolNode**: 从`tool-adapter.ts`移动到`nodes/tool-node.ts`
- **EventNode**: 从`tool-adapter.ts`移动到`nodes/event-node.ts`

这样所有特殊节点都集中在`nodes`目录下，遵循了相同的模式和接口。

### 2. 代理组件重构

- **AgentFlow**: 从`agent-flow.ts`移动到`agent/agent-executor.ts`，职责是协调执行代理流程
- **ToolFlowAdapter**: 从`tool-adapter.ts`移动到`agent/tool-flow-adapter.ts`，职责是处理工具调用

### 3. 接口抽象

创建了`interfaces`目录，用于存放所有外部依赖的接口定义，使得模块可以独立运行而不依赖外部包。

### 4. 导出结构优化

优化了各目录下的`index.ts`文件，确保它们只导出需要公开的组件：

- `src/nodes/index.ts`: 导出所有节点类型
- `src/agent/index.ts`: 导出代理执行器和工具处理器
- `src/index.ts`: 导出所有公共API

## 重构收益

1. **职责分离**: 每个文件都有明确的单一职责
2. **模块化**: 相关功能被组织在同一目录下
3. **可维护性**: 更小的文件更容易理解和维护
4. **可扩展性**: 新的节点类型可以轻松添加到`nodes`目录
5. **独立性**: 移除了对外部模块的依赖，使代码可以独立运行

## 目录结构

```
src/
  ├── agent/
  │   ├── agent-executor.ts  # 代理执行器
  │   ├── tool-flow-adapter.ts  # 工具流适配器
  │   └── index.ts  # 导出agent目录下的组件
  │
  ├── context/
  │   ├── context-manager.ts
  │   ├── context-node.ts
  │   ├── prompt-builder.ts
  │   └── index.ts
  │
  ├── core/
  │   ├── flow.ts
  │   ├── node.ts
  │   ├── shared-store.ts
  │   ├── types.ts
  │   └── index.ts
  │
  ├── interfaces/
  │   ├── agent-interface.ts
  │   ├── model-provider.ts
  │   └── index.ts
  │
  ├── nodes/
  │   ├── agent-node.ts  # 代理节点
  │   ├── event-node.ts  # 事件节点
  │   ├── memory-node.ts  # 记忆节点
  │   ├── output-parser-node.ts  # 输出解析节点
  │   ├── retry-node.ts  # 重试节点
  │   ├── router-node.ts  # 路由节点
  │   ├── tool-node.ts  # 工具节点
  │   └── index.ts  # 导出所有节点
  │
  ├── utils/
  │   └── ... (各种工具函数)
  │
  └── index.ts  # 主导出文件
```
