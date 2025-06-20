# Agent Flow 项目结构

本文档描述了 `@multimodal/agent-flow` 模块的项目结构和各个组件之间的关系。

## 目录结构

```
/src
  /core          - 核心框架组件
    /flow.ts     - 流程定义和执行
    /node.ts     - 节点基类
    /shared-store.ts - 共享存储
    /types.ts    - 类型定义
    /index.ts    - 导出所有核心组件
  
  /nodes         - 专用节点类型
    /agent-node.ts     - LLM 交互节点
    /router-node.ts    - 条件路由节点
    /tool-node.ts      - 工具执行节点
    /event-node.ts     - 事件发送节点
    /retry-node.ts     - 重试逻辑节点
    /memory-node.ts    - 记忆管理节点
    /output-parser-node.ts - 输出解析节点
    /index.ts          - 导出所有节点
  
  /agents        - 基于 Flow 的代理实现
    /flow-based-agent.ts - 完整代理实现
    /tool-flow-adapter.ts - 工具适配器
    /index.ts          - 导出所有代理组件
  
  /interfaces    - 类型定义和接口
    /agent-interface.ts - 代理相关接口
    /model-provider.ts  - 模型提供者接口
    /index.ts          - 导出所有接口
  
  /utils         - 工具函数和辅助类
    /logger.ts          - 日志记录
    /error-recovery.ts  - 错误恢复
    /observable-flow.ts - 可观测流程
    /conversation-manager.ts - 会话管理
    /index.ts           - 导出所有工具
  
  /context       - 上下文管理
    /context-manager.ts - 上下文管理器
    /context-node.ts    - 上下文节点
    /prompt-builder.ts  - 提示构建工具
    /index.ts           - 导出上下文组件
  
  /agent         - 向后兼容层 (已废弃)
    /agent-executor.ts  - 已废弃，重定向到 agents/flow-based-agent.ts
    /tool-flow-adapter.ts - 已废弃，重定向到 agents/tool-flow-adapter.ts
    /index.ts           - 重导出新的实现
  
  /index.ts      - 主模块导出文件

/examples      - 使用示例
  /simple-agent.ts         - 简单代理示例
  /advanced-agent.ts       - 高级代理示例
  /parallel-tools.ts       - 并行工具执行示例
  /flow-based-agent-example.ts - 使用 FlowBasedAgent 的示例
  /README.md               - 示例说明

/docs          - 文档
  /usage-guide.md          - 使用指南
  /api-reference.md        - API 参考

/README.md     - 项目概述
/package.json  - 项目配置
/tsconfig.json - TypeScript 配置
```

## 组件关系图

```
                   +----------------+
                   |     index.ts   |
                   +--------+-------+
                            |
        +-------------------+-------------------+
        |                   |                   |
+-------v------+    +-------v------+    +-------v------+
|    core      |    |    agents    |    |    nodes     |
+-------+------+    +-------+------+    +-------+------+
        |                   |                   |
        |                   |                   |
+-------v------+    +-------v------+    +-------v------+
|  Flow        |    |FlowBasedAgent|    | AgentNode    |
|  Node        |    |ToolFlowAdapter    | RouterNode   |
|  SharedStore |    |              |    | ToolNode     |
+-------+------+    +-------+------+    | EventNode    |
        |                   |           | RetryNode    |
        |                   |           +-------+------+
        |                   |                   |
        +-------------------+-------------------+
                            |
                   +--------v-------+
                   |   interfaces   |
                   +--------+-------+
                            |
        +-------------------+-------------------+
        |                   |                   |
+-------v------+    +-------v------+    +-------v------+
|    utils     |    |   context    |    |    agent     |
+-------+------+    +-------+------+    +-------+------+
        |                   |                   |
        |                   |                   |
+-------v------+    +-------v------+    +-------v------+
| FlowLogger   |    |ContextManager|    |  (废弃, 重定向)|
| ObservableFlow    |PromptBuilder |    |  到 agents/   |
| ErrorRecovery|    |ContextNode   |    |              |
+-------+------+    +-------+------+    +--------------+
```

## 主要对象类型及其职责

### 核心组件

- **Flow** - 管理节点之间的连接和执行流程
- **Node** - 执行计算任务的基本单元
- **SharedStore** - 提供节点间的数据共享机制

### 专用节点

- **AgentNode** - 与 LLM 交互
- **RouterNode** - 基于条件决定执行路径
- **ToolNode** - 执行工具调用
- **EventNode** - 发送事件
- **RetryNode** - 处理重试逻辑
- **MemoryNode** - 管理记忆和检索
- **OutputParserNode** - 解析输出为结构化数据

### 代理实现

- **FlowBasedAgent** - 完整的基于流的代理实现
- **ToolFlowAdapter** - 工具调用的流程适配

### 实用工具

- **FlowLogger** - 日志记录
- **ObservableFlow** - 提供流程执行可观测性
- **ConversationManager** - 管理对话历史
- **ErrorRecoveryUtils** - 错误恢复工具

### 上下文管理

- **ContextManager** - 管理提示和上下文
- **PromptBuilder** - 构建提示
- **ContextNode** - 处理上下文的节点

## 重要概念与设计原则

1. **基于图的计算模型** - 将复杂流程建模为节点和连接的图
2. **模块化设计** - 每个节点专注于单一职责
3. **共享状态** - 使用 SharedStore 在节点间共享数据
4. **可扩展性** - 轻松添加新的节点类型和流程
5. **错误处理** - 内置错误恢复和重试机制
6. **向后兼容** - 保留已弃用的路径以实现平滑过渡

## 从 agent 模块到 agent-flow 的关系

agent-flow 模块是对原始 agent 模块的替代实现，它基于图形计算模型提供了更灵活、可扩展的代理框架。两个模块可以共存，用户可以根据需求选择使用哪一个。
