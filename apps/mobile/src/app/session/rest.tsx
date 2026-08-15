import { router, useLocalSearchParams } from 'expo-router';
import { FastForward, TimerReset } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Screen, Title } from '@/components/ui';
import { exercises } from '@/data/catalog';
import { colors, spacing, typography } from '@/theme/tokens';

export default function RestScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const [remaining, setRemaining] = useState(Number(params.rest ?? 45));
  const exercise = exercises.find((item) => item.slug === params.exercise);
  const currentSet = Number(params.set ?? 1);
  const next = () =>
    router.replace(
      `/session/active?${new URLSearchParams({ ...params, set: String(currentSet + 1) }).toString()}`,
    );
  useEffect(() => {
    if (remaining <= 0) {
      next();
      return;
    }
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  });
  return (
    <Screen style={styles.screen}>
      <View style={styles.center}>
        <View style={styles.timerWrap}>
          <TimerReset color={colors.lavenderDark} size={32} />
          <Text accessibilityLiveRegion="polite" style={styles.timer}>
            {remaining}
          </Text>
          <Text style={styles.seconds}>seconds</Text>
        </View>
        <Eyebrow>Rest and reset</Eyebrow>
        <Title compact>Let the last set settle.</Title>
        <Body muted>
          Next: set {currentSet + 1} of {params.sets} for {exercise?.name ?? 'your exercise'}.
        </Body>
      </View>
      <Card tone="lavender">
        <Text style={styles.tipTitle}>A simple reset</Text>
        <Body muted>
          Relax your grip and shoulders. Let your breathing return to a pace that feels easy.
        </Body>
      </Card>
      <Button icon={FastForward} onPress={next}>
        Skip rest
      </Button>
      <Button onPress={() => setRemaining(30)} variant="quiet">
        Set rest to 30 seconds
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center' },
  center: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl },
  timerWrap: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: 100,
    height: 200,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 200,
  },
  timer: { color: colors.ink, fontFamily: typography.display, fontSize: 72, lineHeight: 74 },
  seconds: { color: colors.muted, fontFamily: typography.semibold, fontSize: 13 },
  tipTitle: { color: colors.ink, fontFamily: typography.semibold, fontSize: 17 },
});
