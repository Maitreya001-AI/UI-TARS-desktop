/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageParam } from './agent-interface';

/**
 * OpenAI接口
 */
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
