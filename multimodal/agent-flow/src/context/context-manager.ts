import { SharedStore } from '../core/shared-store';

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
