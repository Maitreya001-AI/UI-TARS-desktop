/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 存储数据的键类型
 */
export type StoreKey = string;

/**
 * 任意数据类型
 */
export type AnyData = any;

/**
 * 节点数据处理函数类型
 */
export type NodeProcessFunction = (data: AnyData, store: SharedStore) => Promise<AnyData> | AnyData;

/**
 * 节点连接条件函数类型
 */
export type ConnectionCondition = (data: AnyData, store: SharedStore) => boolean;

/**
 * 节点选项
 */
export interface NodeOptions {
  /**
   * 节点名称
   */
  name: string;

  /**
   * 节点描述
   */
  description?: string;
}

/**
 * 连接选项
 */
export interface ConnectionOptions {
  /**
   * 连接条件
   */
  condition?: ConnectionCondition;
}

/**
 * Flow 执行选项
 */
export interface FlowExecutionOptions {
  /**
   * 初始输入数据
   */
  input?: AnyData;

  /**
   * 共享存储
   */
  store?: SharedStore;

  /**
   * 是否并行执行
   */
  parallel?: boolean;

  /**
   * 中止信号
   */
  abortSignal?: AbortSignal;
}

/**
 * 批处理选项
 */
export interface BatchOptions {
  /**
   * 批量大小
   */
  batchSize?: number;

  /**
   * 是否并行执行
   */
  parallel?: boolean;

  /**
   * 中止信号
   */
  abortSignal?: AbortSignal;
}
