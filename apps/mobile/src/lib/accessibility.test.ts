import { notifyHaptic, selectionHaptic, speakFeedback } from '@/lib/accessibility';

// feedback is opt-in. default onboarding stays quiet.

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

const accessibility: string[] = [];

jest.mock('@/state/useAppStore', () => ({
  useAppStore: Object.assign(
    (selector: (state: { profile: { accessibility: string[] } }) => unknown) =>
      selector({ profile: { accessibility } }),
    {
      getState: () => ({ profile: { accessibility } }),
    },
  ),
}));

const Haptics = jest.requireMock('expo-haptics') as {
  selectionAsync: jest.Mock;
  notificationAsync: jest.Mock;
};
const Speech = jest.requireMock('expo-speech') as { speak: jest.Mock; stop: jest.Mock };

describe('accessibility feedback helpers', () => {
  // store mock is a mutable array so we can flip prefs per test.
  beforeEach(() => {
    accessibility.splice(0, accessibility.length);
    Haptics.selectionAsync.mockClear();
    Haptics.notificationAsync.mockClear();
    Speech.speak.mockClear();
    Speech.stop.mockClear();
  });

  it('stays silent when haptic and spoken preferences are off', async () => {
    // never fire device apis unless the profile says so.
    await selectionHaptic();
    await notifyHaptic('error');
    speakFeedback('Welcome back.');
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('plays haptics and speech only when those preferences are on', async () => {
    accessibility.push('Haptic feedback', 'Spoken feedback');
    await selectionHaptic();
    await notifyHaptic('success');
    speakFeedback('Create your account.');
    expect(Haptics.selectionAsync).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalled();
    expect(Speech.stop).toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledWith('Create your account.', { rate: 0.92 });
  });
});
