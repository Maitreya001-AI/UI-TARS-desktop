/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// 导出核心组件
export * from './core';

// 导出专门节点
export * from './nodes';

// 导出代理实现
export * from './agents';

// 导出与代理相关的组件
export * from './agents';

// 导出工具和辅助函数
export * from './utils';

// 导出上下文管理工具
export * from './context';

// 导出版本信息
export const VERSION = '0.1.0';

/**
 * Pocket Flow - 一个极简、强大的基于图的计算框架
 *
 * 只有约100行核心代码，但提供了灵活的节点和流程定义能力，
 * 支持并行执行、条件路由、共享状态等高级特性。
 *
 * 主要特性:
 * - 轻量级: 核心仅约100行代码
 * - 灵活的图形计算模型: 节点可以代表任何计算单元
 * - 流程控制: 支持条件分支和循环
 * - 并行执行: 支持并行处理数据
 * - 共享状态管理: 使用 SharedStore 在节点之间共享数据
 * - 工具适配器: 轻松集成外部工具
 * - 专门节点类型: 内置常用AI代理操作的节点
 * - 上下文管理: 优化提示和上下文控制
 * - 错误处理和恢复: 内置重试和补偿机制
 * - 日志和可观测性: 跟踪和调试流程执行
 */
