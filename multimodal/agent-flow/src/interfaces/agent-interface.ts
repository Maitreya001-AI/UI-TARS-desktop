export interface Tool {
  name: string;
  description: string;
  schema: any;
}

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  content: string;
}

export interface ChatCompletionMessageToolCall {
  id: string;
  function: {
    name: string;
    arguments?: string;
  };
}

export interface ChatCompletionMessageParam {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ChatCompletionMessageToolCall[];
}

export interface AgentRunOptions {
  input: string;
  model?: {
    id: string;
  };
  sessionId?: string;
  [key: string]: any;
}

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
