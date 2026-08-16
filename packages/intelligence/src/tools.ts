// last gate before a tool runs. phase, shape, media, and duplicates all fail closed.
import { assertNoMedia } from './privacy.js';
import {
  FORBIDDEN_PAYLOAD_KEYS,
  REST_OPTIONS,
  type SessionPhase,
  TOOL_NAMES,
  type ToolCall,
  type ToolDecision,
  type ToolName,
} from './types.js';

// which tools can fire in which phase. keep this tight.
const PHASE_TOOLS: Record<SessionPhase, readonly ToolName[]> = {
  setup: ['profile.read'],
  active: ['feedback.emit', 'speech.speak', 'haptics.pulse', 'adaptation.propose'],
  rest: ['speech.speak', 'haptics.pulse', 'progress.record_set'],
  complete: ['progress.record_exercise', 'profile.note_completion'],
};

const seen = new Set<string>(); // call ids we already ran. duplicates are a no-op.

const requiredString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const argumentsValid = (call: ToolCall): boolean => {
  const args = call.arguments;
  for (const key of Object.keys(args)) {
    if ((FORBIDDEN_PAYLOAD_KEYS as readonly string[]).includes(key)) return false;
  }
  switch (call.tool) {
    case 'feedback.emit':
      return requiredString(args.code) && requiredString(args.channel);
    case 'speech.speak':
      return requiredString(args.utteranceId);
    case 'haptics.pulse':
      return requiredString(args.pattern);
    case 'adaptation.propose':
      return (
        requiredString(args.action) &&
        requiredString(args.reasonCode) &&
        requiredString(args.exerciseId)
      );
    case 'progress.record_set':
    case 'progress.record_exercise':
      return requiredString(args.exerciseId) && typeof args.acceptedReps === 'number';
    case 'profile.read':
      return true; // no args on purpose. extra keys already failed the forbidden-key loop.
    case 'profile.note_completion':
      return requiredString(args.exerciseId) && requiredString(args.outcome);
    default:
      return false; // unknown tools should have failed earlier; fail closed anyway.
  }
};

export const resetToolIdempotency = (): void => {
  seen.clear(); // tests and a new session share this module-level set
};

export const validateToolCall = (phase: SessionPhase, call: ToolCall): ToolDecision => {
  try {
    assertNoMedia(call.arguments);
  } catch {
    return { ok: false, code: 'media_field_present', callId: call.callId };
  }
  if (!(TOOL_NAMES as readonly string[]).includes(call.tool)) {
    return { ok: false, code: 'unknown_tool', callId: call.callId };
  }
  if (!PHASE_TOOLS[phase].includes(call.tool)) {
    return { ok: false, code: 'phase_forbidden', callId: call.callId }; // wrong time of the session
  }
  if (seen.has(call.callId)) {
    return { ok: false, code: 'duplicate_call', callId: call.callId };
  }
  if (!argumentsValid(call)) {
    return { ok: false, code: 'invalid_arguments', callId: call.callId };
  }
  // rest length is a closed list so we do not invent a duration mid-session
  if (call.tool === 'adaptation.propose' && call.arguments.action === 'insert_rest') {
    const seconds = call.arguments.restSeconds;
    if (typeof seconds === 'number' && !(REST_OPTIONS as readonly number[]).includes(seconds)) {
      return { ok: false, code: 'invalid_arguments', callId: call.callId };
    }
  }
  seen.add(call.callId);
  return { ok: true, call };
};
