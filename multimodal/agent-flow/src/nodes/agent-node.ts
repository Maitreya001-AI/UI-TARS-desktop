/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ChatCompletionMessageParam,
  OpenAI
} from '../interfaces';
import { Node } from '../core/node';
import { SharedStore } from '../core/shared-store';

/**
 * AgentNode - 代理节点
 *
 * 用于与 LLM 进行交互的节点。
 */
export class AgentNode extends Node {
  /**
   * 构造函数
   *
   * @param id 节点 ID
   * @param llmClient LLM 客户端
   * @param systemPrompt 系统提示
   * @param temperature 温度参数
   * @param maxTokens 最大 token 数量
   */
  constructor(
    id: string,
    private llmClient: OpenAI,
    private systemPrompt: string,
    private temperature: number = 0.7,
    private maxTokens?: number,
  ) {
    super(id, async (input, store) => {
      const messages = this.buildMessages(input, store);

      // 调用 LLM
      const completion = await this.llmClient.chat.completions.create({
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        model: input.model || store.get('model'),
        tools: store.get('tools') || [],
      });

      const response = completion.choices[0].message;

      // 将响应存入存储
      store.set('last_response', response);
      store.append('message_history', response);

      return response;
    });
  }

  /**
   * 构建消息
   *
   * @param input 输入数据
   * @param store 共享存储
   * @returns 消息数组
   */
  private buildMessages(input: any, store: SharedStore): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

    // 添加系统提示
    messages.push({
      role: 'system',
      content: this.systemPrompt,
    });

    // 添加历史消息
    const messageHistory = store.get('message_history');
    if (Array.isArray(messageHistory) && messageHistory.length > 0) {
      messages.push(...messageHistory);
    }

    // 添加输入消息
    if (input.message) {
      messages.push(input.message);
    }

    return messages;
  }
}
