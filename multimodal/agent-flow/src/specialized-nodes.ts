/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node } from './node';
import { SharedStore } from './shared-store';
import { AnyData } from './types';

/**
 * MemoryNode - 用于处理记忆和检索的节点
 *
 * 该节点可以保存、检索和处理对话历史和其他持久化信息。
 */
export class MemoryNode extends Node {
  /**
   * 构造函数
   *
   * @param id 节点 ID
   * @param memoryKey 记忆在存储中的键
   * @param maxMemoryItems 最大记忆项数量
   */
  constructor(
    id: string,
    private memoryKey: string = 'memory',
    private maxMemoryItems: number = 100,
  ) {
    super(id, async (input, store) => {
      const memory = this.getMemory(store);

      // 处理记忆操作
      if (input.operation === 'add' && input.item) {
        return this.addToMemory(input.item, store);
      } else if (input.operation === 'retrieve' && input.query) {
        return this.retrieveFromMemory(input.query, store);
      } else if (input.operation === 'clear') {
        return this.clearMemory(store);
      } else if (input.operation === 'summarize') {
        return this.summarizeMemory(store);
      }

      // 如果没有特定操作，返回完整记忆
      return { memory };
    });
  }

  /**
   * 获取记忆
   *
   * @param store 共享存储
   * @returns 记忆数组
   */
  private getMemory(store: SharedStore): AnyData[] {
    return store.get(this.memoryKey) || [];
  }

  /**
   * 添加项到记忆中
   *
   * @param item 要添加的项
   * @param store 共享存储
   * @returns 添加后的记忆
   */
  private addToMemory(item: AnyData, store: SharedStore): AnyData {
    const memory = this.getMemory(store);

    // 添加时间戳
    const memoryItem = {
      ...item,
      timestamp: item.timestamp || Date.now(),
    };

    // 添加到记忆
    memory.push(memoryItem);

    // 如果超过最大项数，移除最旧的
    if (memory.length > this.maxMemoryItems) {
      memory.shift();
    }

    store.set(this.memoryKey, memory);

    return {
      added: memoryItem,
      memorySize: memory.length,
      memory,
    };
  }

  /**
   * 从记忆中检索
   *
   * @param query 查询
   * @param store 共享存储
   * @returns 检索结果
   */
  private retrieveFromMemory(query: string, store: SharedStore): AnyData {
    const memory = this.getMemory(store);

    // 简单关键词匹配
    // 在实际应用中，这里可以使用向量检索或其他更复杂的匹配方法
    const results = memory.filter((item) => {
      if (typeof item.content === 'string') {
        return item.content.toLowerCase().includes(query.toLowerCase());
      }
      return false;
    });

    return {
      query,
      results,
      count: results.length,
    };
  }

  /**
   * 清空记忆
   *
   * @param store 共享存储
   * @returns 操作结果
   */
  private clearMemory(store: SharedStore): AnyData {
    const oldSize = this.getMemory(store).length;
    store.set(this.memoryKey, []);

    return {
      operation: 'clear',
      previousSize: oldSize,
      success: true,
    };
  }

  /**
   * 总结记忆
   *
   * @param store 共享存储
   * @returns 记忆摘要
   */
  private summarizeMemory(store: SharedStore): AnyData {
    const memory = this.getMemory(store);

    // 计算基本统计信息
    const messageCount = memory.length;
    const userMessages = memory.filter((item) => item.role === 'user').length;
    const assistantMessages = memory.filter((item) => item.role === 'assistant').length;
    const toolCalls = memory.filter((item) => item.role === 'tool').length;

    // 提取最早和最新的时间戳
    const timestamps = memory
      .map((item) => item.timestamp)
      .filter((timestamp) => typeof timestamp === 'number');

    const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : null;

    return {
      messageCount,
      userMessages,
      assistantMessages,
      toolCalls,
      oldestTimestamp,
      newestTimestamp,
      memorySize: JSON.stringify(memory).length,
    };
  }
}

/**
 * RouterNode - 用于在不同节点之间进行路由的节点
 *
 * 该节点可以根据输入或存储中的状态，决定执行流程应该走哪个分支。
 */
export class RouterNode extends Node {
  private routes: Map<string, (input: AnyData, store: SharedStore) => boolean> = new Map();
  private defaultRoute: string | null = null;

  /**
   * 构造函数
   *
   * @param id 节点 ID
   */
  constructor(id: string) {
    super(id, async (input, store) => {
      // 记录所有匹配的路由
      const matchedRoutes: string[] = [];

      // 检查所有路由条件
      for (const [route, condition] of this.routes.entries()) {
        if (condition(input, store)) {
          matchedRoutes.push(route);
        }
      }

      // 如果有匹配的路由，返回第一个
      if (matchedRoutes.length > 0) {
        return {
          input,
          route: matchedRoutes[0],
          allMatches: matchedRoutes,
        };
      }

      // 如果没有匹配的路由，返回默认路由
      if (this.defaultRoute) {
        return {
          input,
          route: this.defaultRoute,
          isDefault: true,
        };
      }

      // 如果没有默认路由，返回错误
      return {
        input,
        error: 'No matching route found',
        routingFailed: true,
      };
    });
  }

  /**
   * 添加路由
   *
   * @param route 路由名称
   * @param condition 路由条件
   * @returns this (链式调用)
   */
  addRoute(route: string, condition: (input: AnyData, store: SharedStore) => boolean): RouterNode {
    this.routes.set(route, condition);
    return this;
  }

  /**
   * 设置默认路由
   *
   * @param route 默认路由名称
   * @returns this (链式调用)
   */
  setDefaultRoute(route: string): RouterNode {
    this.defaultRoute = route;
    return this;
  }
}

/**
 * OutputParserNode - 用于解析结构化输出的节点
 *
 * 该节点可以将 LLM 输出解析为结构化数据。
 */
export class OutputParserNode extends Node {
  /**
   * 构造函数
   *
   * @param id 节点 ID
   * @param schema 输出模式 (可选)
   */
  constructor(
    id: string,
    private schema?: any,
  ) {
    super(id, async (input, store) => {
      let content = '';

      // 尝试获取内容
      if (typeof input === 'string') {
        content = input;
      } else if (input.content) {
        content = typeof input.content === 'string' ? input.content : JSON.stringify(input.content);
      } else if (input.text) {
        content = typeof input.text === 'string' ? input.text : JSON.stringify(input.text);
      } else {
        return {
          error: 'No content to parse',
          input,
        };
      }

      // 尝试解析 JSON
      try {
        // 查找 JSON 块
        const jsonMatches =
          content.match(/```json\s*({[\s\S]*?})\s*```/) ||
          content.match(/({[\s\S]*})/) ||
          content.match(/<json>([\s\S]*?)<\/json>/);

        let parsedData;

        if (jsonMatches && jsonMatches[1]) {
          // 解析找到的 JSON 块
          parsedData = JSON.parse(jsonMatches[1]);
        } else {
          // 尝试将整个内容解析为 JSON
          parsedData = JSON.parse(content);
        }

        // 如果有模式，验证
        if (this.schema) {
          // 这里可以添加模式验证逻辑
          // 简单示例，实际应用中可以使用如 ajv 的库
          for (const key of Object.keys(this.schema.properties || {})) {
            if (this.schema.required?.includes(key) && parsedData[key] === undefined) {
              return {
                error: `Missing required field: ${key}`,
                partial: parsedData,
                input: content,
              };
            }
          }
        }

        return {
          parsed: parsedData,
          input: content,
        };
      } catch (error) {
        return {
          error: `Parsing error: ${error.message}`,
          input: content,
        };
      }
    });
  }
}

/**
 * RetryNode - 用于处理重试逻辑的节点
 *
 * 该节点可以在操作失败时进行重试。
 */
export class RetryNode extends Node {
  private attempts = 0;

  /**
   * 构造函数
   *
   * @param id 节点 ID
   * @param targetNodeId 目标节点 ID
   * @param maxRetries 最大重试次数
   * @param delayMs 重试延迟(毫秒)
   */
  constructor(
    id: string,
    private targetNodeId: string,
    private maxRetries: number = 3,
    private delayMs: number = 1000,
  ) {
    super(id, async (input, store) => {
      // 检查是否有错误
      const hasError = input.error || input.failed;

      if (!hasError) {
        // 如果没有错误，重置尝试计数并返回输入
        this.attempts = 0;
        return input;
      }

      // 增加尝试计数
      this.attempts++;

      // 如果超过最大重试次数，返回失败
      if (this.attempts > this.maxRetries) {
        return {
          ...input,
          retryFailed: true,
          attempts: this.attempts,
          maxRetries: this.maxRetries,
        };
      }

      // 等待延迟
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));

      // 返回重试信息
      return {
        ...input,
        retry: true,
        targetNode: this.targetNodeId,
        attempt: this.attempts,
        maxRetries: this.maxRetries,
      };
    });
  }
}
