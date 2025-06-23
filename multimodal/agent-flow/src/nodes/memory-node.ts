import { Node } from '../core/node';
import { SharedStore } from '../core/shared-store';
import { AnyData } from '../core/types';

export class MemoryNode extends Node {
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

  private getMemory(store: SharedStore): AnyData[] {
    return store.get(this.memoryKey) || [];
  }

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

  private clearMemory(store: SharedStore): AnyData {
    const oldSize = this.getMemory(store).length;
    store.set(this.memoryKey, []);

    return {
      operation: 'clear',
      previousSize: oldSize,
      success: true,
    };
  }

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
