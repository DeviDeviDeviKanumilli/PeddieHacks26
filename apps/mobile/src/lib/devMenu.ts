import { requireOptionalNativeModule } from 'expo-modules-core';

type DevMenuPreferencesModule = {
  setPreferencesAsync?: (settings: Record<string, boolean>) => Promise<void>;
};

export const hideExpoDevMenuFab = (): void => {
  if (!__DEV__) return;
  const prefs = requireOptionalNativeModule<DevMenuPreferencesModule>('DevMenuPreferences');
  void prefs?.setPreferencesAsync?.({
    showFab: false,
    showFloatingActionButton: false,
  });
};
