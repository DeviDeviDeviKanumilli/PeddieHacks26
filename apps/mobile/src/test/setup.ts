jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
}));

jest.mock('adaptfit-pose', () => ({
  isPoseTrackingAvailable: () => false,
  PoseCameraView: () => null,
}));
