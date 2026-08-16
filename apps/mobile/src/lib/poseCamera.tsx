import { isPoseTrackingAvailable, type PoseAnglesEvent, PoseCameraView } from 'adaptfit-pose';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import type { TrackingRecipe } from '@/lib/tracking/recipes';
import { recipeLandmarkProps } from '@/lib/tracking/recipes';

export { isPoseTrackingAvailable, type PoseAnglesEvent };

// wraps the native pose view. expo go has no module, so this renders nothing.
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
  // inactive or missing native binary: skip the view so we don't keep a camera session.
  if (!isPoseTrackingAvailable() || !active) return null;
  // pass joint indices only. frames and landmarks stay inside native code.
  const landmarks = recipe === undefined ? undefined : recipeLandmarkProps(recipe);
  return (
    <PoseCameraView
      enabled={active}
      facing="front" // seated work faces the user; back camera would be a wall.
      style={style ?? StyleSheet.absoluteFill}
      {...(landmarks === undefined
        ? {}
        : {
            leftLandmarks: landmarks.leftLandmarks,
            rightLandmarks: landmarks.rightLandmarks,
          })}
      {...(onAngles === undefined ? {} : { onAngles })}
    />
  );
};
