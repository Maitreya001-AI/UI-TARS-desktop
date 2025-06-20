/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 日志记录器
 */
export class FlowLogger {
  private static instance: FlowLogger;
  private logStore: Array<{
    timestamp: number;
    level: LogLevel;
    nodeId?: string;
    flowId?: string;
    message: string;
    data?: any;
  }> = [];
  private listeners: ((log: any) => void)[] = [];
  private logLevel: LogLevel = LogLevel.INFO;

  /**
   * 获取实例
   */
  static getInstance(): FlowLogger {
    if (!FlowLogger.instance) {
      FlowLogger.instance = new FlowLogger();
    }
    return FlowLogger.instance;
  }

  /**
   * 设置日志级别
   *
   * @param level 日志级别
   */
  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * 添加监听器
   *
   * @param listener 监听函数
   * @returns 取消监听的函数
   */
  addListener(listener: (log: any) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  /**
   * 记录日志
   *
   * @param level 日志级别
   * @param message 日志消息
   * @param nodeId 节点 ID
   * @param flowId 流程 ID
   * @param data 附加数据
   */
  log(level: LogLevel, message: string, nodeId?: string, flowId?: string, data?: any): void {
    // 检查日志级别
    const levelPriority = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };

    if (levelPriority[level] < levelPriority[this.logLevel]) {
      return;
    }

    const logEntry = {
      timestamp: Date.now(),
      level,
      nodeId,
      flowId,
      message,
      data,
    };

    this.logStore.push(logEntry);

    // 通知监听器
    for (const listener of this.listeners) {
      try {
        listener(logEntry);
      } catch (e) {
        console.error('Error in log listener:', e);
      }
    }

    // 控制台输出
    const levelToMethod = {
      [LogLevel.DEBUG]: 'debug',
      [LogLevel.INFO]: 'info',
      [LogLevel.WARN]: 'warn',
      [LogLevel.ERROR]: 'error',
    };

    const prefix = [
      new Date(logEntry.timestamp).toISOString(),
      level.toUpperCase(),
      nodeId ? `[${nodeId}]` : '',
      flowId ? `(${flowId})` : '',
    ]
      .filter(Boolean)
      .join(' ');

    console[levelToMethod[level] as 'debug' | 'info' | 'warn' | 'error'](
      `${prefix}: ${message}`,
      data || '',
    );
  }

  /**
   * 获取日志
   *
   * @returns 日志数组
   */
  getLogs(): any[] {
    return [...this.logStore];
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logStore = [];
  }

  /**
   * 记录调试级别日志
   *
   * @param message 日志消息
   * @param nodeId 节点 ID
   * @param flowId 流程 ID
   * @param data 附加数据
   */
  debug(message: string, nodeId?: string, flowId?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, nodeId, flowId, data);
  }

  /**
   * 记录信息级别日志
   *
   * @param message 日志消息
   * @param nodeId 节点 ID
   * @param flowId 流程 ID
   * @param data 附加数据
   */
  info(message: string, nodeId?: string, flowId?: string, data?: any): void {
    this.log(LogLevel.INFO, message, nodeId, flowId, data);
  }

  /**
   * 记录警告级别日志
   *
   * @param message 日志消息
   * @param nodeId 节点 ID
   * @param flowId 流程 ID
   * @param data 附加数据
   */
  warn(message: string, nodeId?: string, flowId?: string, data?: any): void {
    this.log(LogLevel.WARN, message, nodeId, flowId, data);
  }

  /**
   * 记录错误级别日志
   *
   * @param message 日志消息
   * @param nodeId 节点 ID
   * @param flowId 流程 ID
   * @param data 附加数据
   */
  error(message: string, nodeId?: string, flowId?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, nodeId, flowId, data);
  }
}
