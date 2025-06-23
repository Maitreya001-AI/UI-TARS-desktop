import { ChatCompletionMessageParam } from './agent-interface';

export interface OpenAI {
  chat: {
    completions: {
      create(options: {
        messages: ChatCompletionMessageParam[];
        temperature?: number;
        max_tokens?: number;
        model?: string;
        tools?: any[];
      }): Promise<{
        choices: {
          message: any;
        }[];
      }>;
    };
  };
}
