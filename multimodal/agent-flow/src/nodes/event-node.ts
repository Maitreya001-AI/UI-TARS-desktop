/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '../interfaces';
import { Node } from '../core/node';

/**
 * EventNode - 事件发送节点
 *
 * 该节点用于向事件流发送事件。
 */
export class EventNode extends Node {
  /**
   * 构造函数
   *
   * @param id 节点 ID
   * @param eventType 事件类型
   * @param eventStream 事件流
   */
  constructor(
    id: string,
    private eventType: string,
    private eventStream: AgentEventStream.Processor,
  ) {
    super(id, async (input, store) => {
      // 发送事件
      const event = this.eventStream.createEvent(this.eventType as any, input);

      this.eventStream.sendEvent(event);

      return input;
    });
  }
}
