import { Node } from '../core/node';
import { SharedStore } from '../core/shared-store';
import { AnyData } from '../core/types';

/**
 * RetryNode - 用于处理重试逻辑的节点
 *
 * 该节点可以在操作失败时进行重试。
 */
export class RetryNode extends Node {
  private attempts = 0;

  /**
   * 构造函数
   *
   * @param id 节点 ID
   * @param targetNodeId 目标节点 ID
   * @param maxRetries 最大重试次数
   * @param delayMs 重试延迟(毫秒)
   */
  constructor(
    id: string,
    private targetNodeId: string,
    private maxRetries: number = 3,
    private delayMs: number = 1000,
  ) {
    super(id, async (input, store) => {
      // 检查是否有错误
      const hasError = input.error || input.failed;

      if (!hasError) {
        // 如果没有错误，重置尝试计数并返回输入
        this.attempts = 0;
        return input;
      }

      // 增加尝试计数
      this.attempts++;

      // 如果超过最大重试次数，返回失败
      if (this.attempts > this.maxRetries) {
        return {
          ...input,
          retryFailed: true,
          attempts: this.attempts,
          maxRetries: this.maxRetries,
        };
      }

      // 等待延迟
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));

      // 返回重试信息
      return {
        ...input,
        retry: true,
        targetNode: this.targetNodeId,
        attempt: this.attempts,
        maxRetries: this.maxRetries,
      };
    });
  }
}
