jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
}));
