/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SharedStore } from '../core/shared-store';

/**
 * 会话上下文管理器
 *
 * 管理对话上下文和状态，提供对话历史的分段和总结功能。
 */
export class ConversationManager {
  private store: SharedStore;
  private historyKey: string;
  private maxHistoryLength: number;

  /**
   * 构造函数
   *
   * @param store 共享存储
   * @param historyKey 历史记录在存储中的键
   * @param maxHistoryLength 最大历史记录长度
   */
  constructor(store: SharedStore, historyKey = 'conversation_history', maxHistoryLength = 100) {
    this.store = store;
    this.historyKey = historyKey;
    this.maxHistoryLength = maxHistoryLength;

    // 初始化历史记录
    if (!this.store.has(this.historyKey)) {
      this.store.set(this.historyKey, []);
    }
  }

  /**
   * 添加用户消息
   *
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 添加的消息
   */
  addUserMessage(content: string | object, metadata: object = {}): any {
    return this.addMessage({
      role: 'user',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: Date.now(),
      ...metadata,
    });
  }

  /**
   * 添加助手消息
   *
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 添加的消息
   */
  addAssistantMessage(content: string | object, metadata: object = {}): any {
    return this.addMessage({
      role: 'assistant',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: Date.now(),
      ...metadata,
    });
  }

  /**
   * 添加系统消息
   *
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 添加的消息
   */
  addSystemMessage(content: string | object, metadata: object = {}): any {
    return this.addMessage({
      role: 'system',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: Date.now(),
      ...metadata,
    });
  }

  /**
   * 添加工具消息
   *
   * @param toolName 工具名称
   * @param content 消息内容
   * @param toolCallId 工具调用 ID
   * @param metadata 元数据
   * @returns 添加的消息
   */
  addToolMessage(
    toolName: string,
    content: string | object,
    toolCallId: string,
    metadata: object = {},
  ): any {
    return this.addMessage({
      role: 'tool',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      tool_call_id: toolCallId,
      name: toolName,
      timestamp: Date.now(),
      ...metadata,
    });
  }

  /**
   * 添加消息
   *
   * @param message 消息
   * @returns 添加的消息
   */
  addMessage(message: any): any {
    const history = this.getHistory();

    // 添加消息
    history.push(message);

    // 如果超过最大长度，移除最旧的消息
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }

    // 更新存储
    this.store.set(this.historyKey, history);

    return message;
  }

  /**
   * 获取历史记录
   *
   * @returns 历史记录数组
   */
  getHistory(): any[] {
    return this.store.get(this.historyKey) || [];
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.store.set(this.historyKey, []);
  }

  /**
   * 获取最近的 N 条消息
   *
   * @param count 消息数量
   * @returns 最近的消息
   */
  getRecentMessages(count: number): any[] {
    const history = this.getHistory();
    return history.slice(-count);
  }

  /**
   * 获取消息历史以 LLM 可用的格式
   *
   * @returns 格式化的消息历史
   */
  getFormattedHistory(): any[] {
    const history = this.getHistory();

    // 格式化为标准消息格式
    return history.map((message) => {
      const formatted: any = {
        role: message.role,
        content: message.content,
      };

      // 添加工具相关字段
      if (message.role === 'tool') {
        formatted.tool_call_id = message.tool_call_id;
        if (message.name) {
          formatted.name = message.name;
        }
      }

      return formatted;
    });
  }

  /**
   * 获取按角色分组的消息
   *
   * @returns 按角色分组的消息
   */
  getMessagesByRole(): Record<string, any[]> {
    const history = this.getHistory();
    const result: Record<string, any[]> = {};

    for (const message of history) {
      const role = message.role;
      if (!result[role]) {
        result[role] = [];
      }
      result[role].push(message);
    }

    return result;
  }
}
