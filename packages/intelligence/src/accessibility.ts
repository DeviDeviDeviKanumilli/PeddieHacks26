import type { AccessibilityFlags, SessionPhase, ToolName } from './types.js';

export const enabledChannels = (
  flags: AccessibilityFlags,
): { visual: boolean; voice: boolean; haptic: boolean } => ({
  visual: true,
  voice: flags.spokenFeedback,
  haptic: flags.hapticFeedback,
});

export const toolAllowedForAccessibility = (tool: ToolName, flags: AccessibilityFlags): boolean => {
  if (tool === 'speech.speak') return flags.spokenFeedback;
  if (tool === 'haptics.pulse') return flags.hapticFeedback;
  return true;
};

export const visualEmphasis = (flags: AccessibilityFlags): 'static' | 'animated' =>
  flags.reducedMotion ? 'static' : 'animated';

export const controlMinHeight = (flags: AccessibilityFlags): number =>
  flags.oneHanded || flags.largerText ? 56 : 48;

export const phaseWithoutCamera = (phase: SessionPhase): boolean =>
  phase === 'setup' || phase === 'complete';
