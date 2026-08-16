import { CameraView } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, RotateCcw } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Screen, Title } from '@/components/ui';
import { useAppIsActive } from '@/hooks/useAppIsActive';
import { isPoseTrackingAvailable, SessionCamera } from '@/lib/poseCamera';
import { getTrackingRecipe } from '@/lib/tracking/recipes';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function CameraSetupScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const appIsActive = useAppIsActive();
  const query = new URLSearchParams(params).toString();
  const recipe = getTrackingRecipe(params.exercise ?? '');
  const nativePose = isPoseTrackingAvailable();
  const isWallPushUp = params.exercise === 'wall-push-up';
  const isKneeExtension = params.exercise === 'seated-knee-extension';
  const setupTitle = isWallPushUp
    ? 'Place the camera beside you.'
    : isKneeExtension
      ? 'Place the camera beside your chair.'
      : 'Make space to move comfortably.';
  const setupBody = isWallPushUp
    ? 'Use a side view with your shoulder, elbow, wrist, hip, and knee visible. Keep the phone stable while you use the wall.'
    : isKneeExtension
      ? 'Use a side view with your hip, knee, and ankle visible. Keep your full lower leg in frame.'
      : 'Place the phone where your working joints are visible. You can adjust or turn off tracking later.';
  const readyText = isWallPushUp
    ? 'Start with straight arms and keep your body in one line.'
    : isKneeExtension
      ? 'Start with your knee comfortably bent and your thigh supported.'
      : 'Keep the full working area inside the guide.';
  return (
    <Screen>
      <View style={styles.intro}>
        <Eyebrow>Camera setup</Eyebrow>
        <Title compact>{setupTitle}</Title>
        <Body muted>{setupBody}</Body>
      </View>
      <View style={styles.preview}>
        {appIsActive ? (
          nativePose ? (
            <SessionCamera active recipe={recipe} />
          ) : (
            <CameraView facing="front" mirror style={StyleSheet.absoluteFill} />
          )
        ) : null}
        <View style={styles.local}>
          <Text style={styles.localText}>On-device preview</Text>
        </View>
      </View>
      <Card tone="success">
        <View style={styles.ready}>
          <Check color={colors.success} size={21} />
          <Text style={styles.readyText}>{readyText}</Text>
        </View>
      </Card>
      <Button icon={Check} onPress={() => router.replace(`/session/active?${query}`)}>
        Framing looks good
      </Button>
      <Button
        icon={RotateCcw}
        onPress={() =>
          router.replace(`/session/active?${query.replace('tracking=1', 'tracking=0')}`)
        }
        variant="quiet"
      >
        Continue without tracking
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs },
  preview: {
    backgroundColor: colors.black,
    borderRadius: radii.lg,
    height: 430,
    overflow: 'hidden',
  },
  local: {
    backgroundColor: 'rgba(20,20,30,0.72)',
    borderRadius: radii.pill,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: 'absolute',
    top: spacing.md,
  },
  localText: { color: colors.surface, fontFamily: typography.semibold, fontSize: 11 },
  ready: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  readyText: { color: colors.ink, flex: 1, fontFamily: typography.medium, fontSize: 14 },
});
