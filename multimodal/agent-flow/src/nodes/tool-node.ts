/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool } from '../interfaces';
import { Node } from '../core/node';

/**
 * ToolNode - 工具执行节点
 *
 * 该节点用于执行单个工具调用，并返回执行结果。
 */
export class ToolNode extends Node {
  /**
   * 构造函数
   *
   * @param id 节点 ID
   * @param toolName 工具名称
   * @param tool 工具定义
   * @param executeTool 工具执行函数
   */
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
