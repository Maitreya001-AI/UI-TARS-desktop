/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnyData, NodeOptions, NodeProcessFunction } from './types';
import { SharedStore } from './shared-store';

/**
 * Node - 图中的节点，代表一个计算单元
 *
 * 节点接收输入数据，执行处理函数，并生成输出数据。
 * 节点可以访问共享存储来获取和设置数据。
 */
export class Node {
  private id: string;
  private name: string;
  private description: string;
  private processFunction: NodeProcessFunction;

  /**
   * 构造函数
   *
   * @param idOrOptions 节点 ID 或节点选项
   * @param processFunction 处理函数
   */
  constructor(idOrOptions: string | NodeOptions, processFunction: NodeProcessFunction) {
    if (typeof idOrOptions === 'string') {
      this.id = idOrOptions;
      this.name = idOrOptions;
      this.description = '';
    } else {
      this.id = idOrOptions.name;
      this.name = idOrOptions.name;
      this.description = idOrOptions.description || '';
    }

    this.processFunction = processFunction;
  }

  /**
   * 获取节点 ID
   *
   * @returns 节点 ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取节点名称
   *
   * @returns 节点名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取节点描述
   *
   * @returns 节点描述
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * 执行节点
   *
   * @param input 输入数据
   * @param store 共享存储
   * @returns 处理后的输出数据
   */
  async execute(input: AnyData, store: SharedStore): Promise<AnyData> {
    try {
      const result = await this.processFunction(input, store);
      store.set(`node:${this.id}:output`, result);
      return result;
    } catch (error) {
      store.set(`node:${this.id}:error`, error);
      throw error;
    }
  }
}
