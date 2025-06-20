/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 工具定义
 */
export interface Tool {
  name: string;
  description: string;
  schema: any;
}

/**
 * 工具调用结果
 */
export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  content: string;
}

/**
 * 聊天完成消息工具调用
 */
export interface ChatCompletionMessageToolCall {
  id: string;
  function: {
    name: string;
    arguments?: string;
  };
}

/**
 * 聊天完成消息参数
 */
export interface ChatCompletionMessageParam {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ChatCompletionMessageToolCall[];
}

/**
 * 代理运行选项
 */
export interface AgentRunOptions {
  input: string;
  model?: {
    id: string;
  };
  sessionId?: string;
  [key: string]: any;
}

/**
 * 代理事件流
 */
export namespace AgentEventStream {
  export type EventTypes = 
    | 'user_message'
    | 'assistant_message'
    | 'agent_run_start'
    | 'agent_run_end'
    | 'tool_call'
    | 'tool_result'
    | 'final_answer';
  
  export interface Event {
    type: EventTypes;
    payload: any;
  }
  
  export interface Processor {
    createEvent(type: EventTypes, payload: any): Event;
    sendEvent(event: Event): void;
  }
}
