/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flow } from '../core/flow';
import { SharedStore } from '../core/shared-store';
import { AnyData } from '../core/types';
import { FlowLogger } from './logger';

/**
 * 可观察的流程
 *
 * 包装 Flow 类，添加观察和日志记录功能。
 */
export class ObservableFlow {
  private flow: Flow;
  private logger = FlowLogger.getInstance();
  private id: string;
  private eventListeners: Map<string, Set<(event: string, data: any) => void>> = new Map();

  /**
   * 构造函数
   *
   * @param flow 流程
   * @param id 流程 ID
   */
  constructor(flow: Flow, id = `flow_${Date.now()}`) {
    this.flow = flow;
    this.id = id;

    this.logger.info(`创建可观察流程`, undefined, this.id);
  }

  /**
   * 监听事件
   *
   * @param event 事件名称
   * @param callback 回调函数
   * @returns 取消监听的函数
   */
  on(event: string, callback: (event: string, data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    const listeners = this.eventListeners.get(event)!;
    listeners.add(callback);

    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  /**
   * 发送事件
   *
   * @param event 事件名称
   * @param data 事件数据
   */
  emit(event: string, data: any): void {
    this.logger.debug(`事件: ${event}`, undefined, this.id, data);

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event, data);
        } catch (e) {
          this.logger.error(`事件监听器错误: ${e.message}`, undefined, this.id, {
            event,
            error: e,
          });
        }
      }
    }

    // 发送通用事件
    const anyListeners = this.eventListeners.get('*');
    if (anyListeners) {
      for (const listener of anyListeners) {
        try {
          listener(event, data);
        } catch (e) {
          this.logger.error(`通用事件监听器错误: ${e.message}`, undefined, this.id, {
            event,
            error: e,
          });
        }
      }
    }
  }

  /**
   * 执行流程
   *
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(options: any = {}): Promise<AnyData> {
    const startTime = Date.now();
    this.logger.info(`开始执行流程`, undefined, this.id, options);
    this.emit('flow:start', { options });

    try {
      // 包装 store 以添加事件
      const originalStore = options.store || new SharedStore();
      const wrappedStore = new Proxy(originalStore, {
        get: (target, prop) => {
          if (prop === 'set') {
            return (key: string, value: any) => {
              const result = target.set(key, value);
              this.emit('store:set', { key, value });
              return result;
            };
          }
          if (prop === 'get') {
            return (key: string) => {
              const value = target.get(key);
              this.emit('store:get', { key, value });
              return value;
            };
          }
          if (prop === 'delete') {
            return (key: string) => {
              const result = target.delete(key);
              this.emit('store:delete', { key });
              return result;
            };
          }
          return target[prop as keyof SharedStore];
        },
      });

      // 执行流程
      const result = await this.flow.execute({
        ...options,
        store: wrappedStore,
      });

      const duration = Date.now() - startTime;
      this.logger.info(`流程执行完成`, undefined, this.id, { duration });
      this.emit('flow:complete', { result, duration });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`流程执行错误: ${error.message}`, undefined, this.id, { error });
      this.emit('flow:error', { error, duration });
      throw error;
    }
  }
}
