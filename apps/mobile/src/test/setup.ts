// keep native side effects out of jest. real haptics/speech/pose are device-only.

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// expo go and ci have no mediapipe binary. tests should behave like the fallback path.
jest.mock('adaptfit-pose', () => ({
  isPoseTrackingAvailable: () => false,
  PoseCameraView: () => null,
}));

// speech is opt-in in production; tests should not talk.
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));
