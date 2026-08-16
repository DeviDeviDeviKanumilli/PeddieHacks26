import { assertNoMedia } from './privacy.js';
import type { MotionEvent } from './types.js';

type Handler = (event: MotionEvent) => void;

// in-process only. this is not a log you can replay later.
export class MotionEventBus {
  private readonly handlers = new Map<MotionEvent['type'] | '*', Set<Handler>>();
  private droppedFeatures = 0;

  subscribe(type: MotionEvent['type'] | '*', handler: Handler): () => void {
    // '*' is for tests and debug. production listeners should pick a type.
    const bucket = this.handlers.get(type) ?? new Set<Handler>();
    bucket.add(handler);
    this.handlers.set(type, bucket);
    return () => bucket.delete(handler); // unsub does not drop the empty set. that is fine.
  }

  publish(event: MotionEvent, featureBackpressure = false): boolean {
    assertNoMedia(event.payload); // throws. do not catch here or dirty payloads would still fan out
    if (event.type === 'feature_sample' && featureBackpressure) {
      this.droppedFeatures += 1; // samples are cheap, lifecycle events are not
      return false;
    }
    for (const handler of this.handlers.get(event.type) ?? []) handler(event);
    for (const handler of this.handlers.get('*') ?? []) handler(event); // * is extra, not a replacement
    return true;
  }

  get droppedFeatureCount(): number {
    return this.droppedFeatures;
  }
}
