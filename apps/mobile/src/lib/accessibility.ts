import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useAppStore } from '@/state/useAppStore';

export const accessibilityPreferences = [
  'Larger text',
  'High contrast',
  'Reduced motion',
  'Spoken feedback',
  'Haptic feedback',
  'One-handed controls',
] as const;

export type AccessibilityPreference = (typeof accessibilityPreferences)[number];

const hasPreference = (preference: AccessibilityPreference): boolean =>
  useAppStore.getState().profile.accessibility.includes(preference);

export const selectionHaptic = async (): Promise<void> => {
  if (!hasPreference('Haptic feedback')) return;
  await Haptics.selectionAsync();
};

export const notifyHaptic = async (type: 'success' | 'warning' | 'error'): Promise<void> => {
  if (!hasPreference('Haptic feedback')) return;
  const feedback =
    type === 'success'
      ? Haptics.NotificationFeedbackType.Success
      : type === 'warning'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Error;
  await Haptics.notificationAsync(feedback);
};

export const speakFeedback = (text: string): void => {
  if (!hasPreference('Spoken feedback') || text.trim().length === 0) return;
  Speech.stop();
  Speech.speak(text, { rate: 0.92 });
};

export const stopSpokenFeedback = (): void => {
  Speech.stop();
};

export const useAccessibility = () => {
  const selected = useAppStore((state) => state.profile.accessibility);
  const enabled = new Set(selected);
  return {
    largerText: enabled.has('Larger text'),
    highContrast: enabled.has('High contrast'),
    reducedMotion: enabled.has('Reduced motion'),
    spoken: enabled.has('Spoken feedback'),
    haptics: enabled.has('Haptic feedback'),
    oneHanded: enabled.has('One-handed controls'),
    textScale: enabled.has('Larger text') ? 1.18 : 1,
    controlMinHeight: enabled.has('One-handed controls') || enabled.has('Larger text') ? 56 : 48,
    selectionHaptic,
    notifyHaptic,
    speak: speakFeedback,
  };
};
