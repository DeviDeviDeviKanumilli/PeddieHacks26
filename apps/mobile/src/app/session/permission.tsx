import { useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Screen, Title } from '@/components/ui';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function PermissionScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const [permission, requestPermission] = useCameraPermissions();
  const query = new URLSearchParams(params).toString();
  const continueWithCamera = async () => {
    const result = permission?.granted ? permission : await requestPermission();
    if (result.granted) router.replace(`/session/camera-setup?${query}`);
  };
  const continueWithout = () =>
    router.replace(`/session/active?${query.replace('tracking=1', 'tracking=0')}`);
  return (
    <Screen>
      <View style={styles.icon}>
        <Camera color={colors.lavenderDark} size={38} />
      </View>
      <View style={styles.intro}>
        <Eyebrow>Optional movement feedback</Eyebrow>
        <Title compact>Your camera stays yours.</Title>
        <Body muted>
          AdaptFit can use the front camera to help frame your movement. Permission is never
          required to complete a workout.
        </Body>
      </View>
      <Card tone="lavender">
        <PrivacyRow
          icon={LockKeyhole}
          text="No video, images, or audio are recorded or uploaded."
        />
        <PrivacyRow
          icon={ShieldCheck}
          text="Only derived measurements may be saved in live mode."
        />
      </Card>
      <Button icon={Camera} onPress={() => void continueWithCamera()}>
        Allow camera
      </Button>
      <Button onPress={continueWithout} variant="quiet">
        Continue without camera
      </Button>
      {permission?.canAskAgain === false && !permission.granted ? (
        <Text style={styles.denied}>
          Camera access is disabled in system settings. You can continue without tracking.
        </Text>
      ) : null}
    </Screen>
  );
}

const PrivacyRow = ({ icon: Icon, text }: { icon: typeof Camera; text: string }) => (
  <View style={styles.row}>
    <Icon color={colors.lavenderDark} size={20} />
    <Text style={styles.rowText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.lg,
    height: 86,
    justifyContent: 'center',
    marginTop: spacing.xxl,
    width: 86,
  },
  intro: { gap: spacing.sm, marginVertical: spacing.lg },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  rowText: {
    color: colors.ink,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  denied: {
    color: colors.danger,
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
