// maps motion events to tool drafts. validation still happens in tools.ts.
import { validateToolCall } from './tools.js';
import type { MotionEvent, OrchestratorInput, ToolCall, ToolDecision } from './types.js';
import { ORCHESTRATOR_PARAMETER_BUDGET } from './types.js';

const id = (prefix: string, event: MotionEvent): string => `${prefix}:${event.atMs}:${event.type}`;

export const parameterBudget = ORCHESTRATOR_PARAMETER_BUDGET; // documented cap, not a loaded model

export const orchestrate = (input: OrchestratorInput): ToolDecision[] => {
  const { event, phase, accessibility, prescription, nativeInference } = input;
  // set/exercise complete belong to rest/complete even if the caller is still in active
  const toolPhase =
    event.type === 'set_complete'
      ? 'rest'
      : event.type === 'exercise_complete'
        ? 'complete'
        : phase;
  const drafts: ToolCall[] = [];
  if (event.type === 'issue_code') {
    const code = String(event.payload.code ?? '');
    const priority = String(event.payload.priority ?? 'low');
    drafts.push({
      tool: 'feedback.emit',
      callId: id('feedback', event),
      arguments: { code, channel: 'visual', priority }, // visual is always ok
    });
    if (accessibility.spokenFeedback) {
      drafts.push({
        tool: 'speech.speak',
        callId: id('speech', event),
        arguments: { utteranceId: code, interrupt: priority === 'high' }, // only talk if they asked for it
      });
    }
    if (accessibility.hapticFeedback && priority === 'high') {
      drafts.push({
        tool: 'haptics.pulse',
        callId: id('haptic-warn', event),
        arguments: { pattern: 'warning', code },
      });
    }
    if (code === 'range_of_motion_short') {
      drafts.push({
        tool: 'adaptation.propose',
        callId: id('adapt', event),
        arguments: {
          action: 'reduce_range', // shrink the envelope, do not rewrite the catalog
          reasonCode: code,
          exerciseId: prescription.exerciseId,
        },
      });
    }
  }
  if (event.type === 'rep_accepted' && accessibility.hapticFeedback) {
    drafts.push({
      tool: 'haptics.pulse',
      callId: id('haptic-rep', event),
      arguments: { pattern: 'success' },
    });
  }
  // set complete is recorded even if haptics are off. progress is not a sensory channel.
  if (event.type === 'set_complete') {
    drafts.push({
      tool: 'progress.record_set',
      callId: id('progress-set', event),
      arguments: {
        exerciseId: prescription.exerciseId,
        acceptedReps: event.payload.acceptedReps ?? 0,
        nativeInference,
      },
    });
  }
  if (event.type === 'exercise_complete') {
    // two tools on purpose: set totals vs a completion mark. different call ids so neither is a duplicate.
    drafts.push({
      tool: 'progress.record_exercise',
      callId: id('progress-ex', event),
      arguments: {
        exerciseId: prescription.exerciseId,
        acceptedReps: event.payload.acceptedReps ?? 0,
        nativeInference,
      },
    });
    drafts.push({
      tool: 'profile.note_completion',
      callId: id('profile', event),
      arguments: { exerciseId: prescription.exerciseId, outcome: 'completed' },
    });
  }
  return drafts.map((call) => validateToolCall(toolPhase, call));
};
