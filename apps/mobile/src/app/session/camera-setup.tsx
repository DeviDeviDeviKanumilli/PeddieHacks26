import { CameraView } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, RotateCcw } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Screen, Title } from '@/components/ui';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function CameraSetupScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const query = new URLSearchParams(params).toString();
  return (
    <Screen>
      <View style={styles.intro}>
        <Eyebrow>Camera setup</Eyebrow>
        <Title compact>Make space to move comfortably.</Title>
        <Body muted>
          Place the phone where your working joints are visible. You can adjust or turn off tracking
          later.
        </Body>
      </View>
      <View style={styles.preview}>
        <CameraView facing="front" mirror style={StyleSheet.absoluteFill} />
        <View style={styles.guide}>
          <View style={styles.head} />
          <View style={styles.torso} />
          <View style={styles.base} />
        </View>
        <View style={styles.local}>
          <Text style={styles.localText}>On-device preview</Text>
        </View>
      </View>
      <Card tone="success">
        <View style={styles.ready}>
          <Check color={colors.success} size={21} />
          <Text style={styles.readyText}>Keep the full working area inside the guide.</Text>
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
  intro: { gap: spacing.xs, marginTop: spacing.md },
  preview: {
    backgroundColor: colors.black,
    borderRadius: radii.lg,
    height: 430,
    overflow: 'hidden',
  },
  guide: {
    alignItems: 'center',
    bottom: 35,
    justifyContent: 'center',
    left: 30,
    position: 'absolute',
    right: 30,
    top: 35,
  },
  head: {
    borderColor: colors.surface,
    borderRadius: 99,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 54,
    width: 54,
  },
  torso: {
    borderColor: colors.surface,
    borderRadius: 40,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 170,
    marginTop: 8,
    width: 120,
  },
  base: {
    borderBottomColor: colors.surface,
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    width: 210,
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
