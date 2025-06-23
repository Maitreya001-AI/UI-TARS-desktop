import { SharedStore } from '../core/shared-store';

export class ConversationManager {
  private store: SharedStore;
  private historyKey: string;
  private maxHistoryLength: number;

  constructor(store: SharedStore, historyKey = 'conversation_history', maxHistoryLength = 100) {
    this.store = store;
    this.historyKey = historyKey;
    this.maxHistoryLength = maxHistoryLength;

    // 初始化历史记录
    if (!this.store.has(this.historyKey)) {
      this.store.set(this.historyKey, []);
    }
  }

  addUserMessage(content: string | object, metadata: object = {}): any {
    return this.addMessage({
      role: 'user',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: Date.now(),
      ...metadata,
    });
  }

  addAssistantMessage(content: string | object, metadata: object = {}): any {
    return this.addMessage({
      role: 'assistant',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: Date.now(),
      ...metadata,
    });
  }

  addSystemMessage(content: string | object, metadata: object = {}): any {
    return this.addMessage({
      role: 'system',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      timestamp: Date.now(),
      ...metadata,
    });
  }

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

  getHistory(): any[] {
    return this.store.get(this.historyKey) || [];
  }

  clearHistory(): void {
    this.store.set(this.historyKey, []);
  }

  getRecentMessages(count: number): any[] {
    const history = this.getHistory();
    return history.slice(-count);
  }

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
