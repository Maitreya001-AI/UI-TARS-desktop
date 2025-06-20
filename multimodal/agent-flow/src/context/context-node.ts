/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node } from '../core/node';
import { AnyData } from '../core/types';
import { ContextManager } from './context-manager';

/**
 * 上下文节点
 *
 * 用于管理和处理上下文的节点。
 */
export class ContextNode extends Node {
  /**
   * 构造函数
   *
   * @param id 节点 ID
   * @param contextManager 上下文管理器
   */
  constructor(
    id: string,
    private contextManager: ContextManager,
  ) {
    super(id, async (input, store) => {
      // 根据操作处理输入
      if (input.operation === 'add' && input.content) {
        return this.handleAddOperation(input);
      } else if (input.operation === 'clear') {
        return this.handleClearOperation();
      } else if (input.operation === 'get') {
        return this.handleGetOperation(input);
      } else if (input.operation === 'format') {
        return this.handleFormatOperation(input);
      }

      // 默认返回当前上下文
      return {
        context: this.contextManager.getContext(),
      };
    });
  }

  /**
   * 处理添加操作
   *
   * @param input 输入
   * @returns 处理结果
   */
  private handleAddOperation(input: AnyData): AnyData {
    const item = typeof input.content === 'string' ? { content: input.content } : input.content;

    const metadata = input.metadata || {};

    const addedItem = this.contextManager.addContext(item, metadata);

    return {
      operation: 'add',
      added: addedItem,
      contextSize: this.contextManager.getContext().length,
    };
  }

  /**
   * 处理清空操作
   *
   * @returns 处理结果
   */
  private handleClearOperation(): AnyData {
    const previousSize = this.contextManager.getContext().length;
    this.contextManager.clearContext();

    return {
      operation: 'clear',
      previousSize,
    };
  }

  /**
   * 处理获取操作
   *
   * @param input 输入
   * @returns 处理结果
   */
  private handleGetOperation(input: AnyData): AnyData {
    if (input.source) {
      return {
        operation: 'get',
        source: input.source,
        context: this.contextManager.getContextBySource(input.source),
      };
    } else if (input.role) {
      return {
        operation: 'get',
        role: input.role,
        context: this.contextManager.getContextByRole(input.role),
      };
    }

    return {
      operation: 'get',
      context: this.contextManager.getContext(),
    };
  }

  /**
   * 处理格式化操作
   *
   * @param input 输入
   * @returns 处理结果
   */
  private handleFormatOperation(input: AnyData): AnyData {
    const maxTokens = input.maxTokens;
    const formattedContext = this.contextManager.buildFormattedContext(maxTokens);

    return {
      operation: 'format',
      formattedContext,
      maxTokens,
    };
  }
}
