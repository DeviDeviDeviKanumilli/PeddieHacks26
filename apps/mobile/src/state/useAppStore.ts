import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { exercises } from '@/data/catalog';
import { buildGuestWorkout } from '@/lib/guestWorkout';
import type {
  AppMode,
  Exercise,
  MovementProfile,
  RegionState,
  Workout,
  WorkoutHistory,
  WorkoutItem,
} from '@/types';

// guest adapter: profile, plan, and history live on device until live mode is on.

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
  accountEmail: string | null;
  catalog: Exercise[];
  profile: MovementProfile;
  recommendedWorkout: Workout;
  history: WorkoutHistory[];
  setMode: (mode: AppMode) => void;
  setAccountEmail: (email: string | null) => void;
  mergeExercises: (exercises: Exercise[]) => void;
  setGoals: (goals: string[]) => void;
  setRegion: (id: string, state: RegionState) => void;
  setCapability: (id: string, state: RegionState) => void;
  setEquipment: (equipment: string[]) => void;
  setAccessibility: (accessibility: string[]) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  clearLocalData: () => void;
  regenerateWorkout: () => void;
  setRecommendedWorkout: (workout: Workout) => void;
  addWorkoutExercise: (exercise: Exercise) => boolean;
  updateWorkoutItem: (
    itemId: string,
    patch: Partial<Pick<WorkoutItem, 'sets' | 'reps' | 'restSeconds'>>,
  ) => void;
  completeWorkout: (summary: Omit<WorkoutHistory, 'id' | 'completedAt'>) => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      mode: 'guest',
      accountEmail: null,
      catalog: exercises,
      profile: defaultProfile,
      recommendedWorkout: buildGuestWorkout(defaultProfile, exercises),
      history: [],
      setMode: (mode) => set({ mode }),
      setAccountEmail: (accountEmail) => set({ accountEmail }),
      mergeExercises: (incoming) =>
        set((state) => {
          // live catalog overlays the seed by slug so guest copy isn't wiped.
          const merged = new Map(state.catalog.map((exercise) => [exercise.slug, exercise]));
          for (const exercise of incoming) merged.set(exercise.slug, exercise);
          return { catalog: [...merged.values()] };
        }),
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
        set((state) => {
          const profile = { ...state.profile, onboardingComplete: true };
          return {
            profile,
            // bake a local plan now so home isn't empty before live generate.
            recommendedWorkout: buildGuestWorkout(profile, state.catalog),
          };
        }),
      resetOnboarding: () => set({ profile: defaultProfile }),
      clearLocalData: () =>
        set({
          // account delete / sign-out: drop local history, stay in guest.
          mode: 'guest',
          accountEmail: null,
          catalog: exercises,
          profile: defaultProfile,
          recommendedWorkout: buildGuestWorkout(defaultProfile, exercises),
          history: [],
        }),
      regenerateWorkout: () =>
        set((state) => ({
          recommendedWorkout: buildGuestWorkout(state.profile, state.catalog),
        })),
      setRecommendedWorkout: (recommendedWorkout) => set({ recommendedWorkout }),
      addWorkoutExercise: (exercise) => {
        let added = false;
        set((state) => {
          if (state.recommendedWorkout.items.some((item) => item.exerciseSlug === exercise.slug)) {
            return state;
          }
          added = true;
          return {
            recommendedWorkout: {
              ...state.recommendedWorkout,
              items: [
                ...state.recommendedWorkout.items,
                {
                  id: `guest-item-${exercise.slug}-${Date.now()}`,
                  exerciseSlug: exercise.slug,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restSeconds: exercise.restSeconds,
                },
              ],
            },
          };
        });
        return added;
      },
      updateWorkoutItem: (itemId, patch) =>
        set((state) => ({
          recommendedWorkout: {
            ...state.recommendedWorkout,
            items: state.recommendedWorkout.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    // clamp guest edits so a typo can't request 200 reps.
                    ...(patch.sets === undefined
                      ? {}
                      : { sets: Math.min(5, Math.max(1, patch.sets)) }),
                    ...(patch.reps === undefined
                      ? {}
                      : { reps: Math.min(50, Math.max(1, patch.reps)) }),
                    ...(patch.restSeconds === undefined
                      ? {}
                      : { restSeconds: Math.min(90, Math.max(30, patch.restSeconds)) }),
                  }
                : item,
            ),
          },
        })),
      completeWorkout: (summary) =>
        set((state) => ({
          // guest history: counts and duration only. no pose payloads.
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
      version: 2,
      storage: createJSONStorage(() => Storage),
      partialize: (state) => ({
        // catalog stays in the bundle so seed updates ship with the app.
        mode: state.mode,
        accountEmail: state.accountEmail,
        profile: state.profile,
        recommendedWorkout: state.recommendedWorkout,
        history: state.history,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Pick<
          AppStore,
          'mode' | 'accountEmail' | 'profile' | 'recommendedWorkout' | 'history'
        >;
        if (version >= 2) return state;
        return {
          ...state,
          // v1 plans didn't follow the current avoid/equipment rules.
          recommendedWorkout: buildGuestWorkout(state.profile ?? defaultProfile, exercises),
        };
      },
    },
  ),
);
