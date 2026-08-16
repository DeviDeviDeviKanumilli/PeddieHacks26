import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import { type ComponentType, createElement } from 'react';
import { View, type ViewProps } from 'react-native';

// js only sees derived angles + confidence. landmarks stay in native code.
export type PoseAnglesEvent = {
  nativeEvent: {
    leftAngle: number | null;
    rightAngle: number | null;
    confidence: number;
  };
};

export type PoseCameraViewProps = ViewProps & {
  enabled?: boolean;
  facing?: 'front' | 'back';
  // mediapipe indices for the joint triple, not a pose dump.
  leftLandmarks?: readonly [number, number, number];
  rightLandmarks?: readonly [number, number, number];
  onAngles?: (event: PoseAnglesEvent) => void;
};

type AdaptfitPoseNativeModule = {
  isAvailable: () => boolean;
};

let nativeModule: AdaptfitPoseNativeModule | null = null;
let NativeView: ComponentType<PoseCameraViewProps> | null = null;

try {
  nativeModule = requireNativeModule<AdaptfitPoseNativeModule>('AdaptfitPose');
  NativeView = requireNativeViewManager<PoseCameraViewProps>('AdaptfitPose');
} catch {
  // expo go and simulators without a custom binary land here. do not pretend tracking works.
  nativeModule = null;
  NativeView = null;
}

export const isPoseTrackingAvailable = (): boolean => nativeModule?.isAvailable() === true;

export const PoseCameraView =
  NativeView ??
  function PoseCameraFallback(props: PoseCameraViewProps) {
    // blank view so layout still works; guest sessions fall back to the labeled timer.
    return createElement(View, props);
  };
