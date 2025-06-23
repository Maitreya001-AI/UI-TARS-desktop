import { Node } from '../core/node';
import { SharedStore } from '../core/shared-store';
import { AnyData } from '../core/types';
import { FlowLogger } from './logger';

export class ErrorRecoveryUtils {
  static withFallback(
    originalNode: Node,
    fallbackFn: (error: Error, input: AnyData, store: SharedStore) => Promise<AnyData> | AnyData,
  ): Node {
    const originalId = originalNode.getId();
    const wrappedId = `${originalId}_with_fallback`;

    return new Node(wrappedId, async (input, store) => {
      try {
        // 尝试执行原始节点
        return await originalNode.execute(input, store);
      } catch (error) {
        // 记录错误
        const logger = FlowLogger.getInstance();
        logger.warn(`节点 ${originalId} 执行失败，使用补偿策略`, wrappedId, undefined, { error });

        // 执行补偿策略
        return await fallbackFn(error, input, store);
      }
    });
  }

  static withTimeout(
    originalNode: Node,
    timeoutMs: number,
    timeoutFn: (input: AnyData, store: SharedStore) => Promise<AnyData> | AnyData,
  ): Node {
    const originalId = originalNode.getId();
    const wrappedId = `${originalId}_with_timeout`;

    return new Node(wrappedId, async (input, store) => {
      // 创建超时 Promise
      const timeoutPromise = new Promise<AnyData>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Node execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // 创建执行 Promise
      const executionPromise = originalNode.execute(input, store);

      try {
        // 使用 Promise.race 实现超时
        return await Promise.race([executionPromise, timeoutPromise]);
      } catch (error) {
        // 如果是超时错误
        if (error.message.includes('timed out')) {
          const logger = FlowLogger.getInstance();
          logger.warn(`节点 ${originalId} 执行超时`, wrappedId, undefined, { timeoutMs });

          // 执行超时处理函数
          return await timeoutFn(input, store);
        }

        // 其他错误直接抛出
        throw error;
      }
    });
  }

  static withRetry(
    originalNode: Node,
    maxRetries = 3,
    delayMs = 1000,
    shouldRetry: (error: Error) => boolean = () => true,
  ): Node {
    const originalId = originalNode.getId();
    const wrappedId = `${originalId}_with_retry`;

    return new Node(wrappedId, async (input, store) => {
      const logger = FlowLogger.getInstance();
      let lastError: Error;

      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          // 尝试执行原始节点
          const result = await originalNode.execute(input, store);

          // 如果是重试成功，记录日志
          if (attempt > 1) {
            logger.info(`节点 ${originalId} 重试成功，第 ${attempt - 1} 次重试`, wrappedId);
          }

          return result;
        } catch (error) {
          lastError = error;

          // 如果达到最大重试次数或不应该重试，抛出错误
          if (attempt > maxRetries || !shouldRetry(error)) {
            if (attempt > 1) {
              logger.error(
                `节点 ${originalId} 重试失败，已达到最大重试次数`,
                wrappedId,
                undefined,
                { error },
              );
            }
            throw error;
          }

          // 记录重试日志
          logger.warn(
            `节点 ${originalId} 执行失败，准备第 ${attempt} 次重试`,
            wrappedId,
            undefined,
            { error },
          );

          // 等待延迟
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      // 理论上不会执行到这里，但为了类型安全
      throw lastError!;
    });
  }
}
