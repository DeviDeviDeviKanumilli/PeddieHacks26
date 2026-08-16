import { assertNoMedia } from './privacy.js';
import type { MotionEvent } from './types.js';

type Handler = (event: MotionEvent) => void;

export class MotionEventBus {
  private readonly handlers = new Map<MotionEvent['type'] | '*', Set<Handler>>();
  private droppedFeatures = 0;

  subscribe(type: MotionEvent['type'] | '*', handler: Handler): () => void {
    const bucket = this.handlers.get(type) ?? new Set<Handler>();
    bucket.add(handler);
    this.handlers.set(type, bucket);
    return () => bucket.delete(handler);
  }

  publish(event: MotionEvent, featureBackpressure = false): boolean {
    assertNoMedia(event.payload);
    if (event.type === 'feature_sample' && featureBackpressure) {
      this.droppedFeatures += 1;
      return false;
    }
    for (const handler of this.handlers.get(event.type) ?? []) handler(event);
    for (const handler of this.handlers.get('*') ?? []) handler(event);
    return true;
  }

  get droppedFeatureCount(): number {
    return this.droppedFeatures;
  }
}
