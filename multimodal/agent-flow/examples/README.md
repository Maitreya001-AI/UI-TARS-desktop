# Agent Flow Examples

此目录包含了使用 `@multimodal/agent-flow` 框架的示例代码。

## 示例列表

- **simple-agent.ts**: 演示了基本的代理功能实现
- **advanced-agent.ts**: 演示了更复杂的代理功能，包括工具调用
- **parallel-tools.ts**: 演示了并行工具调用能力
- **flow-based-agent-example.ts**: 使用新的 FlowBasedAgent 类实现的完整代理示例

## 运行示例

1. 确保已安装依赖

```bash
cd multimodal/agent-flow
npm install
```

2. 设置必要的环境变量

```bash
export OPENAI_API_KEY=your_api_key
```

3. 运行特定示例

```bash
npx ts-node examples/simple-agent.ts
```
