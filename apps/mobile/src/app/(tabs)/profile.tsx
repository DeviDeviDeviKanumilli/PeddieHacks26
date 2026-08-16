import { router } from 'expo-router';
import {
  Accessibility,
  ChevronRight,
  CircleUserRound,
  Dumbbell,
  Goal,
  LogIn,
  LogOut,
  PersonStanding,
  Settings2,
} from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { Body, Button, Card, Screen, SectionHeading, Title } from '@/components/ui';
import { mobileApi } from '@/lib/api';
import { getSupabaseClient } from '@/lib/supabase';
import { useAppStore } from '@/state/useAppStore';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function ProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const mode = useAppStore((state) => state.mode);
  const accountEmail = useAppStore((state) => state.accountEmail);
  const reset = useAppStore((state) => state.resetOnboarding);
  const clearLocalData = useAppStore((state) => state.clearLocalData);
  const editProfile = () => {
    reset();
    // replace into the wizard so back from goals isn't this profile screen mid-reset.
    router.replace('/onboarding/goals');
  };
  const signOut = async () => {
    await getSupabaseClient()?.auth.signOut();
    clearLocalData();
    // guest after sign-out; welcome is the only safe re-entry.
    router.replace('/onboarding/welcome');
  };
  const deleteAccount = () => {
    Alert.alert(
      'Delete AdaptFit account?',
      'This permanently deletes your synced profile, workouts, sessions, and progress. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await mobileApi.deleteAccount();
                await getSupabaseClient()?.auth.signOut();
                clearLocalData();
                router.replace('/onboarding/welcome');
              } catch (error) {
                Alert.alert(
                  'Account was not deleted',
                  error instanceof Error ? error.message : 'Please try again when you are online.',
                );
              }
            })();
          },
        },
      ],
    );
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
            {mode === 'guest' ? 'Saved only on this device' : (accountEmail ?? 'Synced account')}
          </Text>
          {/* guest never hits the api; live shows email once supabase session exists. */}
        </View>
      </Card>
      {mode === 'guest' ? (
        <Button icon={LogIn} onPress={() => router.push('/auth/sign-in')}>
          Sign in to sync progress
        </Button>
      ) : (
        <Button icon={LogOut} onPress={() => void signOut()} variant="quiet">
          Sign out
        </Button>
      )}
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
      {mode === 'live' ? (
        <Button onPress={deleteAccount} variant="danger">
          Delete synced account
        </Button>
      ) : null}
      {/* delete is live-only — guest has no server row to wipe. */}
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
  // display-only for now. edit goes through the wizard, not these rows.
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
  intro: { gap: spacing.xs },
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
});
