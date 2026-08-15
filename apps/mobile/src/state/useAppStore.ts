import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { exercises } from '@/data/catalog';
import type { AppMode, MovementProfile, RegionState, Workout, WorkoutHistory } from '@/types';

const defaultProfile: MovementProfile = {
  goals: [],
  regions: {},
  capabilities: {},
  equipment: ['None'],
  accessibility: [],
  onboardingComplete: false,
};

type AppStore = {
  mode: AppMode;
  profile: MovementProfile;
  recommendedWorkout: Workout;
  history: WorkoutHistory[];
  setMode: (mode: AppMode) => void;
  setGoals: (goals: string[]) => void;
  setRegion: (id: string, state: RegionState) => void;
  setCapability: (id: string, state: RegionState) => void;
  setEquipment: (equipment: string[]) => void;
  setAccessibility: (accessibility: string[]) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  regenerateWorkout: () => void;
  completeWorkout: (summary: Omit<WorkoutHistory, 'id' | 'completedAt'>) => void;
};

const buildWorkout = (): Workout => ({
  id: 'guest-workout-1',
  title: 'Your steady strength set',
  durationMinutes: 18,
  focus: 'Seated upper body + mobility',
  items: exercises.slice(0, 4).map((exercise, index) => ({
    id: `guest-item-${index + 1}`,
    exerciseSlug: exercise.slug,
    sets: exercise.sets,
    reps: exercise.reps,
    restSeconds: exercise.restSeconds,
  })),
});

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      mode: 'guest',
      profile: defaultProfile,
      recommendedWorkout: buildWorkout(),
      history: [],
      setMode: (mode) => set({ mode }),
      setGoals: (goals) => set((state) => ({ profile: { ...state.profile, goals } })),
      setRegion: (id, regionState) =>
        set((state) => ({
          profile: {
            ...state.profile,
            regions: { ...state.profile.regions, [id]: regionState },
          },
        })),
      setCapability: (id, capabilityState) =>
        set((state) => ({
          profile: {
            ...state.profile,
            capabilities: { ...state.profile.capabilities, [id]: capabilityState },
          },
        })),
      setEquipment: (selected) =>
        set((state) => ({ profile: { ...state.profile, equipment: selected } })),
      setAccessibility: (accessibility) =>
        set((state) => ({ profile: { ...state.profile, accessibility } })),
      completeOnboarding: () =>
        set((state) => ({ profile: { ...state.profile, onboardingComplete: true } })),
      resetOnboarding: () => set({ profile: defaultProfile }),
      regenerateWorkout: () => set({ recommendedWorkout: buildWorkout() }),
      completeWorkout: (summary) =>
        set((state) => ({
          history: [
            {
              ...summary,
              id: `history-${Date.now()}`,
              completedAt: new Date().toISOString(),
            },
            ...state.history,
          ],
        })),
    }),
    {
      name: 'adaptfit-mobile-v1',
      storage: createJSONStorage(() => Storage),
      partialize: (state) => ({
        mode: state.mode,
        profile: state.profile,
        recommendedWorkout: state.recommendedWorkout,
        history: state.history,
      }),
    },
  ),
);
