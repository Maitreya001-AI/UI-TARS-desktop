/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SharedStore } from './shared-store';
import { Node } from './node';
import { AnyData } from './types';

/**
 * 上下文项
 */
export interface ContextItem {
  content: string;
  role?: string;
  name?: string;
  timestamp?: number;
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * 上下文管理器
 *
 * 用于管理和组织代理的上下文信息。
 */
export class ContextManager {
  private store: SharedStore;
  private contextKey: string;
  private maxTokenEstimate: number;

  /**
   * 构造函数
   *
   * @param store 共享存储
   * @param contextKey 上下文在存储中的键
   * @param maxTokenEstimate 最大 token 数量估计
   */
  constructor(store: SharedStore, contextKey = 'context', maxTokenEstimate = 4000) {
    this.store = store;
    this.contextKey = contextKey;
    this.maxTokenEstimate = maxTokenEstimate;

    // 初始化上下文
    if (!this.store.has(this.contextKey)) {
      this.store.set(this.contextKey, []);
    }
  }

  /**
   * 获取上下文
   *
   * @returns 上下文数组
   */
  getContext(): ContextItem[] {
    return this.store.get(this.contextKey) || [];
  }

  /**
   * 添加上下文项
   *
   * @param item 上下文项或内容字符串
   * @param metadata 元数据
   * @returns 添加的上下文项
   */
  addContext(item: ContextItem | string, metadata: Record<string, any> = {}): ContextItem {
    const context = this.getContext();

    // 格式化上下文项
    const contextItem: ContextItem =
      typeof item === 'string'
        ? { content: item, timestamp: Date.now(), metadata }
        : {
            ...item,
            timestamp: item.timestamp || Date.now(),
            metadata: { ...item.metadata, ...metadata },
          };

    // 添加到上下文
    context.push(contextItem);

    // 更新存储
    this.store.set(this.contextKey, context);

    return contextItem;
  }

  /**
   * 从上下文中删除项
   *
   * @param index 索引或条件函数
   * @returns 是否成功删除
   */
  removeContext(index: number | ((item: ContextItem) => boolean)): boolean {
    const context = this.getContext();

    if (typeof index === 'number') {
      if (index < 0 || index >= context.length) {
        return false;
      }

      context.splice(index, 1);
      this.store.set(this.contextKey, context);
      return true;
    } else {
      const originalLength = context.length;
      const filtered = context.filter((item) => !index(item));

      if (filtered.length === originalLength) {
        return false;
      }

      this.store.set(this.contextKey, filtered);
      return true;
    }
  }

  /**
   * 清空上下文
   */
  clearContext(): void {
    this.store.set(this.contextKey, []);
  }

  /**
   * 按源筛选上下文
   *
   * @param source 源
   * @returns 筛选后的上下文项
   */
  getContextBySource(source: string): ContextItem[] {
    const context = this.getContext();
    return context.filter((item) => item.source === source);
  }

  /**
   * 按角色筛选上下文
   *
   * @param role 角色
   * @returns 筛选后的上下文项
   */
  getContextByRole(role: string): ContextItem[] {
    const context = this.getContext();
    return context.filter((item) => item.role === role);
  }

  /**
   * 构建格式化的上下文
   *
   * @param maxTokens 最大 token 数量
   * @returns 格式化的上下文字符串
   */
  buildFormattedContext(maxTokens?: number): string {
    const context = this.getContext();
    const limit = maxTokens || this.maxTokenEstimate;

    // 按时间戳排序
    const sorted = [...context].sort((a, b) => {
      const aTime = a.timestamp || 0;
      const bTime = b.timestamp || 0;
      return aTime - bTime;
    });

    let result = '';
    let estimatedTokens = 0;

    // 简单的 token 估算: 每 4 个字符约为 1 个 token
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);

    for (const item of sorted) {
      // 格式化项
      let formattedItem = '';

      if (item.role) {
        formattedItem += `[${item.role.toUpperCase()}]`;
        if (item.name) {
          formattedItem += ` ${item.name}: `;
        } else {
          formattedItem += ': ';
        }
      }

      formattedItem += item.content;

      // 换行
      if (!formattedItem.endsWith('\n')) {
        formattedItem += '\n';
      }

      // 检查 token 限制
      const itemTokens = estimateTokens(formattedItem);
      if (estimatedTokens + itemTokens > limit) {
        break;
      }

      result += formattedItem;
      estimatedTokens += itemTokens;
    }

    return result;
  }
}

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

/**
 * 智能提示构建器
 *
 * 帮助构建和组织代理使用的提示。
 */
export class PromptBuilder {
  private sections: Map<string, string> = new Map();
  private order: string[] = [];

  /**
   * 添加提示部分
   *
   * @param id 部分 ID
   * @param content 部分内容
   * @param position 部分位置
   * @returns this (链式调用)
   */
  addSection(id: string, content: string, position?: number): PromptBuilder {
    // 保存内容
    this.sections.set(id, content);

    // 如果已存在，先移除
    const existingIndex = this.order.indexOf(id);
    if (existingIndex !== -1) {
      this.order.splice(existingIndex, 1);
    }

    // 添加到指定位置或末尾
    if (position !== undefined && position >= 0 && position <= this.order.length) {
      this.order.splice(position, 0, id);
    } else {
      this.order.push(id);
    }

    return this;
  }

  /**
   * 移除提示部分
   *
   * @param id 部分 ID
   * @returns this (链式调用)
   */
  removeSection(id: string): PromptBuilder {
    this.sections.delete(id);

    const index = this.order.indexOf(id);
    if (index !== -1) {
      this.order.splice(index, 1);
    }

    return this;
  }

  /**
   * 获取提示部分
   *
   * @param id 部分 ID
   * @returns 部分内容或 undefined
   */
  getSection(id: string): string | undefined {
    return this.sections.get(id);
  }

  /**
   * 构建提示
   *
   * @param separator 分隔符
   * @returns 构建的提示
   */
  build(separator = '\n\n'): string {
    // 按顺序添加各部分
    return this.order
      .map((id) => this.sections.get(id))
      .filter(Boolean)
      .join(separator);
  }

  /**
   * 清空提示
   *
   * @returns this (链式调用)
   */
  clear(): PromptBuilder {
    this.sections.clear();
    this.order = [];
    return this;
  }

  /**
   * 添加系统指令
   *
   * @param content 指令内容
   * @returns this (链式调用)
   */
  addSystemInstruction(content: string): PromptBuilder {
    return this.addSection('system_instruction', content, 0);
  }

  /**
   * 添加角色定义
   *
   * @param content 角色定义
   * @returns this (链式调用)
   */
  addRoleDefinition(content: string): PromptBuilder {
    return this.addSection('role_definition', content, 1);
  }

  /**
   * 添加工具描述
   *
   * @param content 工具描述
   * @returns this (链式调用)
   */
  addTools(content: string): PromptBuilder {
    return this.addSection('tools', content);
  }

  /**
   * 添加上下文
   *
   * @param content 上下文内容
   * @returns this (链式调用)
   */
  addContext(content: string): PromptBuilder {
    return this.addSection('context', content);
  }

  /**
   * 添加示例
   *
   * @param content 示例内容
   * @returns this (链式调用)
   */
  addExamples(content: string): PromptBuilder {
    return this.addSection('examples', content);
  }

  /**
   * 添加约束
   *
   * @param content 约束内容
   * @returns this (链式调用)
   */
  addConstraints(content: string): PromptBuilder {
    return this.addSection('constraints', content);
  }

  /**
   * 添加输出格式
   *
   * @param content 输出格式
   * @returns this (链式调用)
   */
  addOutputFormat(content: string): PromptBuilder {
    return this.addSection('output_format', content);
  }

  /**
   * 添加用户查询
   *
   * @param content 用户查询
   * @returns this (链式调用)
   */
  addUserQuery(content: string): PromptBuilder {
    return this.addSection('user_query', content);
  }
}
