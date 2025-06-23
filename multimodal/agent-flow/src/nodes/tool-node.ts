import { Tool } from '../interfaces';
import { Node } from '../core/node';

export class ToolNode extends Node {
  constructor(
    id: string,
    private toolName: string,
    private tool: Tool,
    private executeTool: (name: string, args: any, toolId?: string) => Promise<any>,
  ) {
    super(id, async (input, store) => {
      const args = input.args || {};
      const toolId = input.toolId;

      // 执行工具
      const result = await this.executeTool(this.toolName, args, toolId);

      // 存储结果
      store.set(`tool:${this.toolName}:result`, result);

      return {
        toolName: this.toolName,
        toolId: toolId,
        result,
      };
    });
  }
}
