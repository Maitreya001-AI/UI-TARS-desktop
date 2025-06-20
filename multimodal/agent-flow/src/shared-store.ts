/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnyData, StoreKey } from './types';

/**
 * 存储订阅回调函数类型
 */
type StoreSubscriber = (data: AnyData, key: StoreKey) => void;

/**
 * SharedStore - 节点间共享数据的机制
 *
 * 该类提供了一个简单的存储机制，允许节点之间共享数据，
 * 并支持数据变更通知。
 */
export class SharedStore {
  private data: Map<StoreKey, AnyData> = new Map();
  private subscribers: Map<StoreKey, Set<StoreSubscriber>> = new Map();

  /**
   * 设置数据
   *
   * @param key 键
   * @param value 值
   */
  set(key: StoreKey, value: AnyData): void {
    this.data.set(key, value);
    this.notifySubscribers(key, value);
  }

  /**
   * 获取数据
   *
   * @param key 键
   * @returns 对应的值，如果不存在则返回 undefined
   */
  get(key: StoreKey): AnyData {
    return this.data.get(key);
  }

  /**
   * 检查是否存在指定键的数据
   *
   * @param key 键
   * @returns 是否存在
   */
  has(key: StoreKey): boolean {
    return this.data.has(key);
  }

  /**
   * 删除数据
   *
   * @param key 键
   * @returns 是否删除成功
   */
  delete(key: StoreKey): boolean {
    const result = this.data.delete(key);
    if (result) {
      this.notifySubscribers(key, undefined);
    }
    return result;
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * 获取所有键
   *
   * @returns 所有键的数组
   */
  keys(): StoreKey[] {
    return Array.from(this.data.keys());
  }

  /**
   * 获取所有值
   *
   * @returns 所有值的数组
   */
  values(): AnyData[] {
    return Array.from(this.data.values());
  }

  /**
   * 获取所有键值对
   *
   * @returns 所有键值对的数组
   */
  entries(): [StoreKey, AnyData][] {
    return Array.from(this.data.entries());
  }

  /**
   * 追加数据到数组中
   * 如果指定的键不存在或不是数组，则创建一个新数组
   *
   * @param key 键
   * @param value 要追加的值
   */
  append(key: StoreKey, value: AnyData): void {
    const currentValue = this.get(key);
    if (Array.isArray(currentValue)) {
      currentValue.push(value);
      this.notifySubscribers(key, currentValue);
    } else {
      this.set(key, [value]);
    }
  }

  /**
   * 订阅数据变更
   *
   * @param key 键
   * @param callback 回调函数
   * @returns 取消订阅的函数
   */
  subscribe(key: StoreKey, callback: StoreSubscriber): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    const subscribers = this.subscribers.get(key)!;
    subscribers.add(callback);

    // 如果数据已经存在，立即通知
    if (this.has(key)) {
      callback(this.get(key), key);
    }

    // 返回取消订阅的函数
    return () => {
      const subscribers = this.subscribers.get(key);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * 通知订阅者数据变更
   *
   * @param key 键
   * @param value 新值
   */
  private notifySubscribers(key: StoreKey, value: AnyData): void {
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      for (const subscriber of subscribers) {
        try {
          subscriber(value, key);
        } catch (error) {
          console.error(`Error in subscriber for key ${key}:`, error);
        }
      }
    }
  }
}
