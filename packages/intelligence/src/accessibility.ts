// channel and layout hints. the orchestrator still has to respect these, not the ui.
import type { AccessibilityFlags, SessionPhase, ToolName } from './types.js';

export const enabledChannels = (
  flags: AccessibilityFlags,
): { visual: boolean; voice: boolean; haptic: boolean } => ({
  visual: true, // you always get the numbers on screen
  voice: flags.spokenFeedback,
  haptic: flags.hapticFeedback,
});

export const toolAllowedForAccessibility = (tool: ToolName, flags: AccessibilityFlags): boolean => {
  if (tool === 'speech.speak') return flags.spokenFeedback;
  if (tool === 'haptics.pulse') return flags.hapticFeedback;
  return true; // progress and profile tools are not sensory channels
};

export const visualEmphasis = (flags: AccessibilityFlags): 'static' | 'animated' =>
  flags.reducedMotion ? 'static' : 'animated'; // only the motion. visual feedback still shows.

export const controlMinHeight = (flags: AccessibilityFlags): number =>
  flags.oneHanded || flags.largerText ? 56 : 48; // 44 is the floor, this gives a bit more

export const phaseWithoutCamera = (phase: SessionPhase): boolean =>
  phase === 'setup' || phase === 'complete'; // these screens never need a preview
