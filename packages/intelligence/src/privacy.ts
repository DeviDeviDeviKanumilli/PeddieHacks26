import type { AllowedPoseSample } from './types.js';
import { FORBIDDEN_PAYLOAD_KEYS } from './types.js';

// this is the wall. frames, coords, notes, none of it comes in.
export const assertNoMedia = (value: Readonly<Record<string, unknown>>): void => {
  for (const key of FORBIDDEN_PAYLOAD_KEYS) {
    if (key in value) {
      throw new Error(`Forbidden field "${key}" cannot enter the intelligence runtime.`);
    }
  }
};

export const isAllowedPoseSample = (value: unknown): value is AllowedPoseSample => {
  // anything weird looking just fails. do not try to salvage it.
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  try {
    assertNoMedia(record);
  } catch {
    return false;
  }
  // four scalars. extra keys that are not forbidden are ignored, not copied through.
  return (
    typeof record.angleDeg === 'number' &&
    typeof record.confidence === 'number' &&
    typeof record.nativeInference === 'boolean' &&
    typeof record.atMs === 'number'
  );
};
