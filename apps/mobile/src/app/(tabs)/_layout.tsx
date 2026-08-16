import { Tabs } from 'expo-router';
import { Dumbbell, Home, Search, TrendingUp, UserRound } from 'lucide-react-native';
import { colors, typography } from '@/theme/tokens';

// lucide names match the five tab files. unknown routes fall back to home.
const icons = {
  index: Home,
  explore: Search,
  workout: Dumbbell,
  progress: TrendingUp,
  profile: UserRound,
};

export default function TabsLayout() {
  // five product tabs. height includes home-indicator padding; keep labels above it.
  return (
    <Tabs
      screenOptions={({ route }) => {
        const Icon = icons[route.name as keyof typeof icons] ?? Home;
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.lavenderDark,
          tabBarInactiveTintColor: colors.muted,
          tabBarIcon: ({ color, focused }) => (
            <Icon color={color} fill={focused ? colors.lavenderSoft : 'none'} size={22} />
          ),
          tabBarLabelStyle: { fontFamily: typography.semibold, fontSize: 11 },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.line,
            // 82 leaves room for the home indicator; labels still clear the 44pt icon hit area.
            height: 82,
            paddingBottom: 16,
            paddingTop: 9,
          },
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
