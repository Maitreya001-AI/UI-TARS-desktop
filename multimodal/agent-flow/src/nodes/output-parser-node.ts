import { Node } from '../core/node';
import { SharedStore } from '../core/shared-store';
import { AnyData } from '../core/types';

export class OutputParserNode extends Node {
  constructor(
    id: string,
    private schema?: any,
  ) {
    super(id, async (input, store) => {
      let content = '';

      // 尝试获取内容
      if (typeof input === 'string') {
        content = input;
      } else if (input.content) {
        content = typeof input.content === 'string' ? input.content : JSON.stringify(input.content);
      } else if (input.text) {
        content = typeof input.text === 'string' ? input.text : JSON.stringify(input.text);
      } else {
        return {
          error: 'No content to parse',
          input,
        };
      }

      // 尝试解析 JSON
      try {
        // 查找 JSON 块
        const jsonMatches =
          content.match(/```json\s*({[\s\S]*?})\s*```/) ||
          content.match(/({[\s\S]*})/) ||
          content.match(/<json>([\s\S]*?)<\/json>/);

        let parsedData;

        if (jsonMatches && jsonMatches[1]) {
          // 解析找到的 JSON 块
          parsedData = JSON.parse(jsonMatches[1]);
        } else {
          // 尝试将整个内容解析为 JSON
          parsedData = JSON.parse(content);
        }

        // 如果有模式，验证
        if (this.schema) {
          // 这里可以添加模式验证逻辑
          // 简单示例，实际应用中可以使用如 ajv 的库
          for (const key of Object.keys(this.schema.properties || {})) {
            if (this.schema.required?.includes(key) && parsedData[key] === undefined) {
              return {
                error: `Missing required field: ${key}`,
                partial: parsedData,
                input: content,
              };
            }
          }
        }

        return {
          parsed: parsedData,
          input: content,
        };
      } catch (error) {
        return {
          error: `Parsing error: ${error.message}`,
          input: content,
        };
      }
    });
  }
}
