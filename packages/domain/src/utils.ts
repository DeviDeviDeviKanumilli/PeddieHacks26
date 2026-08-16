// clamp is used all over generation and analytics. keep it tiny and pure.
// callers pass inclusive bounds. if min > max the result is just max, so don't do that.
export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum); // nan in, nan out. no extra guards on purpose.
