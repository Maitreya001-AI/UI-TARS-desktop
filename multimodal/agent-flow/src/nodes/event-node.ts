import { AgentEventStream } from '../interfaces';
import { Node } from '../core/node';

export class EventNode extends Node {
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
