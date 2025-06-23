import { OpenAI } from '../interfaces/model-provider';

export class MockOpenAI implements OpenAI {
  constructor(config: { apiKey: string; baseURL?: string }) {
    console.log('创建模拟 OpenAI 客户端');
  }

  chat = {
    completions: {
      create: async (options: any) => {
        console.log('模拟调用 OpenAI API:', options.messages[options.messages.length - 1]?.content);

        // 模拟 API 响应
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: '这是一个模拟响应。在实际应用中，这里会是来自 OpenAI API 的真实响应。',
                tool_calls:
                  options.tools && options.tools.length > 0
                    ? [
                        {
                          id: 'call_' + Date.now(),
                          function: {
                            name: options.tools[0].name,
                            arguments: JSON.stringify({ query: '示例查询' }),
                          },
                        },
                      ]
                    : undefined,
              },
            },
          ],
        };
      },
    },
  };
}
