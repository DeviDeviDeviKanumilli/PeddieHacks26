import { router } from 'expo-router';
import {
  Accessibility,
  ChevronRight,
  CircleUserRound,
  Dumbbell,
  Goal,
  LogIn,
  PersonStanding,
  Settings2,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { Body, Button, Card, Screen, SectionHeading, Title } from '@/components/ui';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function ProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const mode = useAppStore((state) => state.mode);
  const reset = useAppStore((state) => state.resetOnboarding);
  const editProfile = () => {
    reset();
    router.replace('/onboarding/goals');
  };
  return (
    <Screen>
      <AppHeader />
      <View style={styles.intro}>
        <Title compact>Your AdaptFit</Title>
        <Body muted>
          Keep your movement profile current so recommendations continue to make sense.
        </Body>
      </View>
      <Card tone="lavender" style={styles.identity}>
        <View style={styles.avatar}>
          <CircleUserRound color={colors.lavenderDark} size={34} />
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{mode === 'guest' ? 'Guest profile' : 'AdaptFit member'}</Text>
          <Text style={styles.email}>
            {mode === 'guest' ? 'Saved only on this device' : 'Synced with your account'}
          </Text>
        </View>
      </Card>
      {mode === 'guest' ? (
        <Button icon={LogIn} onPress={() => router.push('/auth/sign-in')}>
          Sign in to sync progress
        </Button>
      ) : null}
      <SectionHeading title="Movement profile" />
      <Card style={styles.menuCard}>
        <ProfileRow icon={Goal} label="Goals" value={`${profile.goals.length} selected`} />
        <ProfileRow
          icon={PersonStanding}
          label="Movement map"
          value={`${Object.keys(profile.regions).length} marked`}
        />
        <ProfileRow icon={Dumbbell} label="Equipment" value={profile.equipment.join(', ')} />
        <ProfileRow
          icon={Accessibility}
          label="Accessibility"
          value={`${profile.accessibility.length} preferences`}
        />
      </Card>
      <Button icon={Settings2} onPress={editProfile} variant="secondary">
        Edit movement profile
      </Button>
      <SectionHeading title="About your data" />
      <Card>
        <Text style={styles.dataTitle}>Camera data stays on your device.</Text>
        <Body muted>
          AdaptFit never uploads raw video, images, audio, or pose landmarks. Only derived workout
          measurements may be saved when you use a synced account.
        </Body>
      </Card>
    </Screen>
  );
}

const ProfileRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Goal;
  label: string;
  value: string;
}) => (
  <Pressable accessibilityRole="button" style={styles.row}>
    <View style={styles.rowIcon}>
      <Icon color={colors.lavenderDark} size={20} />
    </View>
    <View style={styles.rowCopy}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.rowValue}>
        {value}
      </Text>
    </View>
    <ChevronRight color={colors.muted} size={20} />
  </Pressable>
);

const styles = StyleSheet.create({
  intro: { gap: spacing.xs, marginTop: spacing.md },
  identity: { alignItems: 'center', flexDirection: 'row' },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 30,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  identityCopy: { flex: 1 },
  name: { color: colors.ink, fontFamily: typography.semibold, fontSize: 19 },
  email: { color: colors.muted, fontFamily: typography.body, fontSize: 13 },
  menuCard: { gap: 0, paddingVertical: spacing.xs },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 66,
    paddingVertical: spacing.xs,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowCopy: { flex: 1 },
  rowLabel: { color: colors.ink, fontFamily: typography.semibold, fontSize: 15 },
  rowValue: { color: colors.muted, fontFamily: typography.body, fontSize: 12 },
  dataTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
});
