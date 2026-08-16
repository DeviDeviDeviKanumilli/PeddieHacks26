import { requireOptionalNativeModule } from 'expo-modules-core';

type DevMenuPreferencesModule = {
  setPreferencesAsync?: (settings: Record<string, boolean>) => Promise<void>;
};

// session camera needs the full screen. expo's fab sits on top of it.
export const hideExpoDevMenuFab = (): void => {
  // prod has no fab. skip so we never touch native prefs in a store build.
  if (!__DEV__) return;
  // optional: expo go / some runtimes do not ship this module.
  const prefs = requireOptionalNativeModule<DevMenuPreferencesModule>('DevMenuPreferences');
  // the floating button sits on top of the session camera; hide both knobs expo has used.
  void prefs?.setPreferencesAsync?.({
    showFab: false,
    showFloatingActionButton: false,
  });
};
