import { isPoseTrackingAvailable, type PoseAnglesEvent, PoseCameraView } from 'adaptfit-pose';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import type { TrackingRecipe } from '@/lib/tracking/recipes';
import { recipeLandmarkProps } from '@/lib/tracking/recipes';

export { isPoseTrackingAvailable, type PoseAnglesEvent };

export const SessionCamera = ({
  active,
  recipe,
  onAngles,
  style,
}: {
  active: boolean;
  recipe: TrackingRecipe | undefined;
  onAngles?: (event: PoseAnglesEvent) => void;
  style?: StyleProp<ViewStyle>;
}) => {
  if (!isPoseTrackingAvailable() || !active) return null;
  const landmarks = recipe === undefined ? undefined : recipeLandmarkProps(recipe);
  return (
    <PoseCameraView
      enabled={active}
      facing="front"
      showOverlay
      style={style ?? StyleSheet.absoluteFill}
      {...(landmarks === undefined
        ? {}
        : {
            leftLandmarks: landmarks.leftLandmarks,
            rightLandmarks: landmarks.rightLandmarks,
            leftSecondaryLandmarks: landmarks.leftSecondaryLandmarks,
            rightSecondaryLandmarks: landmarks.rightSecondaryLandmarks,
          })}
      {...(onAngles === undefined ? {} : { onAngles })}
    />
  );
};
