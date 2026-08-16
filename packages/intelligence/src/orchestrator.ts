import { validateToolCall } from './tools.js';
import type { MotionEvent, OrchestratorInput, ToolCall, ToolDecision } from './types.js';
import { ORCHESTRATOR_PARAMETER_BUDGET } from './types.js';

const id = (prefix: string, event: MotionEvent): string => `${prefix}:${event.atMs}:${event.type}`;

export const parameterBudget = ORCHESTRATOR_PARAMETER_BUDGET;

export const orchestrate = (input: OrchestratorInput): ToolDecision[] => {
  const { event, phase, accessibility, prescription, nativeInference } = input;
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
      arguments: { code, channel: 'visual', priority },
    });
    if (accessibility.spokenFeedback) {
      drafts.push({
        tool: 'speech.speak',
        callId: id('speech', event),
        arguments: { utteranceId: code, interrupt: priority === 'high' },
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
          action: 'reduce_range',
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
