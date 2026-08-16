import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import { type ComponentType, createElement } from 'react';
import { View, type ViewProps } from 'react-native';

export type PoseAnglesEvent = {
  nativeEvent: {
    leftAngle?: number | null;
    rightAngle?: number | null;
    leftSecondaryAngle?: number | null;
    rightSecondaryAngle?: number | null;
    leftConfidence?: number;
    rightConfidence?: number;
    confidence: number;
  };
};

export type PoseCameraViewProps = ViewProps & {
  enabled?: boolean;
  facing?: 'front' | 'back';
  leftLandmarks?: readonly [number, number, number];
  rightLandmarks?: readonly [number, number, number];
  leftSecondaryLandmarks?: readonly [number, number, number];
  rightSecondaryLandmarks?: readonly [number, number, number];
  showOverlay?: boolean;
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
  nativeModule = null;
  NativeView = null;
}

export const isPoseTrackingAvailable = (): boolean => nativeModule?.isAvailable() === true;

export const PoseCameraView =
  NativeView ??
  function PoseCameraFallback(props: PoseCameraViewProps) {
    return createElement(View, props);
  };
