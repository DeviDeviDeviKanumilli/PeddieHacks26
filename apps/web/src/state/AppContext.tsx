import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { bodyRegions, demoExercises, demoHistory, demoProgress } from '../data/demo';
import { ApiClient } from '../lib/api';
import { LiveAdapter, mapLiveHistoryItemToUi } from '../lib/liveAdapter';
import { hasLiveConfiguration, supabase } from '../lib/supabase';
import type {
  ApiMode,
  ConstraintMode,
  Exercise,
  MovementProfile,
  ProgressSummary,
  UserProfile,
  WorkoutHistoryItem,
  WorkoutSessionState,
} from '../types';

const demoStorageKey = 'adaptfit-web-demo-state-v1';
const modeStorageKey = 'adaptfit-web-mode-v1';
const liveLocalHistoryStoragePrefix = 'adaptfit-web-live-local-history-v1:';
const liveLocalHistoryIdPrefix = 'local-live-history-';
const maximumStoredLiveHistoryItems = 250;
const maximumHydratedLiveHistoryItems = 20;

type StoredState = {
  user?: UserProfile;
  authenticated?: boolean;
  favorites?: string[];
  profile?: MovementProfile;
  history?: WorkoutHistoryItem[];
  progress?: ProgressSummary;
  coveredRegions?: string[];
};

type StoredLiveHistoryItem = WorkoutHistoryItem & {
  completedSets: number;
};

type StoredLiveState = {
  history: StoredLiveHistoryItem[];
};

const readStoredState = (): StoredState => {
  try {
    return JSON.parse(localStorage.getItem(demoStorageKey) ?? '{}') as StoredState;
  } catch {
    return {};
  }
};

const readStoredMode = (): ApiMode => {
  try {
    const storedMode = localStorage.getItem(modeStorageKey);
    return storedMode === 'live' && hasLiveConfiguration ? 'live' : 'demo';
  } catch {
    return 'demo';
  }
};

const liveLocalHistoryStorageKey = (accountId: string): string =>
  `${liveLocalHistoryStoragePrefix}${encodeURIComponent(accountId)}`;

const historyCategories = new Set<WorkoutHistoryItem['category']>([
  'strength',
  'mobility',
  'core',
  'cardio',
  'balance',
]);

const storedLiveHistoryItem = (value: unknown): StoredLiveHistoryItem | null => {
  if (typeof value !== 'object' || value === null) return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== 'string' ||
    !item.id.startsWith(liveLocalHistoryIdPrefix) ||
    typeof item.title !== 'string' ||
    typeof item.category !== 'string' ||
    !historyCategories.has(item.category as WorkoutHistoryItem['category']) ||
    typeof item.completedAt !== 'string' ||
    !Number.isFinite(Date.parse(item.completedAt)) ||
    typeof item.completedReps !== 'number' ||
    !Number.isFinite(item.completedReps) ||
    item.completedReps < 0 ||
    typeof item.targetReps !== 'number' ||
    !Number.isFinite(item.targetReps) ||
    item.targetReps < 0 ||
    typeof item.durationSeconds !== 'number' ||
    !Number.isFinite(item.durationSeconds) ||
    item.durationSeconds < 0 ||
    typeof item.formScore !== 'number' ||
    !Number.isFinite(item.formScore) ||
    item.formScore < 0 ||
    typeof item.completedSets !== 'number' ||
    !Number.isInteger(item.completedSets) ||
    item.completedSets < 0
  ) {
    return null;
  }
  return {
    id: item.id,
    title: item.title,
    category: item.category as WorkoutHistoryItem['category'],
    completedAt: item.completedAt,
    completedReps: item.completedReps,
    targetReps: item.targetReps,
    durationSeconds: item.durationSeconds,
    formScore: item.formScore,
    completedSets: item.completedSets,
    ...(typeof item.favorite === 'boolean' ? { favorite: item.favorite } : {}),
    ...(typeof item.trackingEnabled === 'boolean' ? { trackingEnabled: item.trackingEnabled } : {}),
  };
};

const parseLiveLocalHistory = (serialized: string | null): StoredLiveHistoryItem[] => {
  if (serialized === null) return [];
  const parsed = JSON.parse(serialized) as unknown;
  if (typeof parsed !== 'object' || parsed === null) return [];
  const history = (parsed as { history?: unknown }).history;
  if (!Array.isArray(history)) return [];
  return history
    .flatMap((item) => {
      const parsedItem = storedLiveHistoryItem(item);
      return parsedItem === null ? [] : [parsedItem];
    })
    .slice(0, maximumStoredLiveHistoryItems);
};

const mergeStoredLiveHistory = (
  existing: readonly StoredLiveHistoryItem[],
  incoming: readonly StoredLiveHistoryItem[],
): StoredLiveHistoryItem[] => {
  const byId = new Map<string, StoredLiveHistoryItem>();
  for (const item of [...existing, ...incoming]) byId.set(item.id, item);
  return [...byId.values()]
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .slice(0, maximumStoredLiveHistoryItems);
};

const readLiveLocalHistory = (accountId: string): StoredLiveHistoryItem[] => {
  try {
    return parseLiveLocalHistory(localStorage.getItem(liveLocalHistoryStorageKey(accountId)));
  } catch {
    return [];
  }
};

type LiveHistoryWriteResult =
  | { ok: true; history: StoredLiveHistoryItem[] }
  | { ok: false; error: string };

const writeLiveLocalHistory = (
  accountId: string,
  history: readonly WorkoutHistoryItem[],
): LiveHistoryWriteResult => {
  try {
    const incomingHistory = history.flatMap((item) => {
      const parsedItem = storedLiveHistoryItem(item);
      return parsedItem === null ? [] : [parsedItem];
    });
    const latestHistory = parseLiveLocalHistory(
      localStorage.getItem(liveLocalHistoryStorageKey(accountId)),
    );
    const storedHistory = mergeStoredLiveHistory(latestHistory, incomingHistory);
    localStorage.setItem(
      liveLocalHistoryStorageKey(accountId),
      JSON.stringify({ history: storedHistory } satisfies StoredLiveState),
    );
    return { ok: true, history: storedHistory };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Browser storage is unavailable for this live account.',
    };
  }
};

const mergeLiveHistory = (
  apiHistory: readonly WorkoutHistoryItem[],
  localHistory: readonly StoredLiveHistoryItem[],
): WorkoutHistoryItem[] => {
  const byId = new Map<string, WorkoutHistoryItem>();
  for (const item of [...apiHistory, ...localHistory]) byId.set(item.id, item);
  return [...byId.values()].sort((left, right) =>
    right.completedAt.localeCompare(left.completedAt),
  );
};

const mergeLiveProgress = (
  apiProgress: ProgressSummary,
  localHistory: readonly StoredLiveHistoryItem[],
  now = new Date(),
): ProgressSummary => {
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const startTime = weekStart.getTime();
  const endTime = now.getTime();
  const weeklyHistory = localHistory.filter((item) => {
    const completedTime = Date.parse(item.completedAt);
    return completedTime >= startTime && completedTime <= endTime;
  });
  return {
    ...apiProgress,
    totalSeconds:
      apiProgress.totalSeconds +
      localHistory.reduce((total, item) => total + item.durationSeconds, 0),
    exercisesCompleted: apiProgress.exercisesCompleted + localHistory.length,
    totalReps:
      apiProgress.totalReps + localHistory.reduce((total, item) => total + item.completedReps, 0),
    totalSets:
      apiProgress.totalSets + localHistory.reduce((total, item) => total + item.completedSets, 0),
    weeklyWorkouts: apiProgress.weeklyWorkouts + weeklyHistory.length,
    weeklySeconds:
      apiProgress.weeklySeconds +
      weeklyHistory.reduce((total, item) => total + item.durationSeconds, 0),
    weeklyReps:
      apiProgress.weeklyReps + weeklyHistory.reduce((total, item) => total + item.completedReps, 0),
    weeklySets:
      apiProgress.weeklySets + weeklyHistory.reduce((total, item) => total + item.completedSets, 0),
  };
};

const initialMovementProfile: MovementProfile = {
  focusRegions: ['Shoulders', 'Core'],
  avoidRegions: ['Lower Back', 'Left Knee'],
  equipment: ['Bodyweight', 'Dumbbells'],
  goals: ['strength', 'mobility'],
  version: 1,
};

const initialCoveredRegions = [
  'Shoulders',
  'Arms',
  'Core',
  'Back',
  'Lower Back',
  'Hips',
  'Left Knee',
];

const initialSession: WorkoutSessionState = {
  status: 'idle',
  exerciseSlug: 'seated-bicep-curl',
  set: 1,
  totalSets: 3,
  reps: 0,
  targetReps: 10,
  elapsedSeconds: 0,
  restSeconds: 45,
  trackingEnabled: false,
  formScore: 92,
  rangeOfMotion: 82,
};

const emptyProgress: ProgressSummary = {
  totalSeconds: 0,
  exercisesCompleted: 0,
  totalReps: 0,
  totalSets: 0,
  bodyCoverage: 0,
  averageFormScore: 0,
  weeklyWorkouts: 0,
  weeklySeconds: 0,
  weeklyReps: 0,
  weeklySets: 0,
};

type AuthResult = { ok: true } | { ok: false; message: string };
type ProfileSyncStatus = 'idle' | 'saving' | 'saved' | 'error';
type LiveDataStatus = 'idle' | 'loading' | 'ready' | 'error';

const liveExerciseSlugForDemoSlug: Readonly<Record<string, string>> = {
  'seated-bicep-curl': 'seated-biceps-curl',
  'seated-shoulder-press': 'seated-shoulder-press',
  'seated-core-twist': 'seated-torso-rotation',
  'chair-march': 'seated-march',
  'resistance-band-row': 'seated-resistance-band-row',
  'glute-bridge': 'supine-bridge',
};

const unverifiedLiveExercises: Exercise[] = demoExercises.map((exercise) => ({
  ...exercise,
  compatibility: 'incompatible',
  cautionReasons:
    liveExerciseSlugForDemoSlug[exercise.slug] === undefined
      ? ['This exercise is not available in the live catalog.']
      : ['Compatibility has not been checked. Refresh live data before continuing.'],
}));

const liveAdapterForAccessToken = (accessToken: string): LiveAdapter =>
  new LiveAdapter(new ApiClient(async () => accessToken));

type AppContextValue = {
  mode: ApiMode;
  isLiveAvailable: boolean;
  authenticated: boolean;
  user: UserProfile;
  exercises: Exercise[];
  regions: string[];
  movementProfile: MovementProfile;
  constraintMode: ConstraintMode;
  selectedExercise: Exercise;
  favorites: Set<string>;
  session: WorkoutSessionState;
  history: WorkoutHistoryItem[];
  progress: ProgressSummary;
  cameraStream: MediaStream | null;
  cameraError: string | null;
  lastCompletedHistoryId: string | null;
  movementProfileSync: ProfileSyncStatus;
  liveDataStatus: LiveDataStatus;
  liveDataError: string | null;
  retryLiveData: () => Promise<void>;
  setMode: (mode: ApiMode) => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (displayName: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  saveUser: (user: UserProfile) => Promise<AuthResult>;
  setConstraintMode: (mode: ConstraintMode) => void;
  updateRegion: (region: string) => void;
  resetRegions: () => void;
  selectExercise: (slug: string) => void;
  toggleFavorite: (slug: string) => void;
  requestCamera: () => Promise<boolean>;
  stopCamera: () => void;
  buildWorkout: (trackingEnabled: boolean) => void;
  beginExercise: () => void;
  addRep: () => void;
  pauseExercise: () => void;
  resumeExercise: () => void;
  restartSet: () => void;
  addRestTime: () => void;
  skipRest: () => void;
  continueAfterRest: () => void;
  endExercise: () => void;
  resetSession: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const stored = useMemo(readStoredState, []);
  const initialMode = useMemo(readStoredMode, []);
  const [mode, setModeState] = useState<ApiMode>(initialMode);
  const [authenticated, setAuthenticated] = useState(
    initialMode === 'demo' ? (stored.authenticated ?? false) : false,
  );
  const [user, setUser] = useState<UserProfile>(
    initialMode === 'demo'
      ? (stored.user ?? { displayName: 'Jordan Lee', email: 'jordan.lee@example.com' })
      : { displayName: 'AdaptFit member', email: '' },
  );
  const [exercises, setExercises] = useState<Exercise[]>(
    initialMode === 'demo' ? demoExercises : unverifiedLiveExercises,
  );
  const [movementProfile, setMovementProfile] = useState<MovementProfile>(
    initialMode === 'demo' ? (stored.profile ?? initialMovementProfile) : initialMovementProfile,
  );
  const [constraintMode, setConstraintMode] = useState<ConstraintMode>('focus');
  const [selectedExerciseSlug, setSelectedExerciseSlug] = useState('seated-bicep-curl');
  const [favorites, setFavorites] = useState(
    () => new Set(initialMode === 'demo' ? (stored.favorites ?? []) : []),
  );
  const [session, setSession] = useState<WorkoutSessionState>(initialSession);
  const [history, setHistory] = useState(
    initialMode === 'demo' ? (stored.history ?? demoHistory) : [],
  );
  const [progress, setProgress] = useState(
    initialMode === 'demo' ? (stored.progress ?? demoProgress) : emptyProgress,
  );
  const [coveredRegions, setCoveredRegions] = useState(
    initialMode === 'demo' ? (stored.coveredRegions ?? initialCoveredRegions) : [],
  );
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastCompletedHistoryId, setLastCompletedHistoryId] = useState<string | null>(null);
  const [movementProfileSync, setMovementProfileSync] = useState<ProfileSyncStatus>('idle');
  const [liveDataStatus, setLiveDataStatus] = useState<LiveDataStatus>(
    initialMode === 'live' ? 'loading' : 'idle',
  );
  const [liveDataError, setLiveDataError] = useState<string | null>(null);
  const [liveAccountId, setLiveAccountId] = useState<string | null>(null);
  const sessionRecordedRef = useRef(false);
  const movementSaveSequenceRef = useRef(0);
  const movementSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const modeRef = useRef<ApiMode>(initialMode);
  const authOperationSequenceRef = useRef(0);
  const signOutOperationRef = useRef<number | null>(null);
  const liveAccountIdRef = useRef<string | null>(null);
  const liveAuthRef = useRef<{ accountId: string; accessToken: string } | null>(null);
  const liveHydrationSequenceRef = useRef(0);
  const liveHydrationPromiseRef = useRef<{
    accountId: string;
    accessToken: string;
    promise: Promise<void>;
  } | null>(null);

  const clearLiveUi = useCallback(
    (status: LiveDataStatus = 'idle', error: string | null = null) => {
      liveHydrationSequenceRef.current += 1;
      liveHydrationPromiseRef.current = null;
      movementSaveSequenceRef.current += 1;
      movementSaveQueueRef.current = Promise.resolve();
      sessionRecordedRef.current = false;
      liveAccountIdRef.current = null;
      liveAuthRef.current = null;
      setLiveAccountId(null);
      setAuthenticated(false);
      setUser({ displayName: 'AdaptFit member', email: '' });
      setMovementProfile(initialMovementProfile);
      setMovementProfileSync('idle');
      setExercises(unverifiedLiveExercises);
      setFavorites(new Set());
      setHistory([]);
      setProgress(emptyProgress);
      setCoveredRegions([]);
      setCameraStream((current) => {
        current?.getTracks().forEach((track) => {
          track.stop();
        });
        return null;
      });
      setCameraError(null);
      setSession(initialSession);
      setLastCompletedHistoryId(null);
      setLiveDataStatus(status);
      setLiveDataError(error);
    },
    [],
  );

  const loadLiveExerciseCompatibility = useCallback(
    async (adapter: LiveAdapter): Promise<Exercise[]> => {
      const results = await Promise.all(
        demoExercises.map(async (exercise) => {
          const liveSlug = liveExerciseSlugForDemoSlug[exercise.slug];
          if (liveSlug === undefined) {
            return {
              exercise: {
                ...exercise,
                compatibility: 'incompatible' as const,
                cautionReasons: ['This exercise is not available in the live catalog.'],
              },
              failed: false,
            };
          }
          try {
            const compatibility = await adapter.getCompatibility(liveSlug);
            const cautionReasons = compatibility.reasons
              .filter((reason) => reason.severity !== 'info')
              .map((reason) => reason.message);
            return {
              exercise: {
                ...exercise,
                compatibility: compatibility.status,
                cautionReasons:
                  cautionReasons.length > 0
                    ? cautionReasons
                    : compatibility.status === 'compatible'
                      ? undefined
                      : ['Review this exercise before continuing.'],
              },
              failed: false,
            };
          } catch {
            return {
              exercise: {
                ...exercise,
                compatibility: 'incompatible' as const,
                cautionReasons: [
                  'Compatibility could not be checked. This exercise is blocked until live data refreshes.',
                ],
              },
              failed: true,
            };
          }
        }),
      );
      const failedCount = results.filter((result) => result.failed).length;
      if (failedCount > 0) {
        throw new Error(
          `Compatibility could not be verified for ${failedCount} ${failedCount === 1 ? 'exercise' : 'exercises'}. Retry live data before choosing a workout.`,
        );
      }
      return results.map((result) => result.exercise);
    },
    [],
  );

  const hydrateLiveAccount = useCallback(
    (accountId: string, authenticatedEmail: string, accessToken: string): Promise<void> => {
      const pending = liveHydrationPromiseRef.current;
      if (pending?.accountId === accountId && pending.accessToken === accessToken) {
        return pending.promise;
      }

      if (liveAccountIdRef.current !== accountId) clearLiveUi('loading');
      else {
        setLiveDataStatus('loading');
        setLiveDataError(null);
      }
      const sequence = liveHydrationSequenceRef.current + 1;
      liveHydrationSequenceRef.current = sequence;
      const accountAdapter = liveAdapterForAccessToken(accessToken);
      const promise = (async () => {
        try {
          const [liveUser, liveMovementProfile, liveProgress, liveHistory, liveExercises] =
            await Promise.all([
              accountAdapter.getUserProfile(authenticatedEmail),
              accountAdapter.getMovementProfile(),
              accountAdapter.getProgressSummary(),
              accountAdapter.listHydratedHistory(maximumHydratedLiveHistoryItems),
              loadLiveExerciseCompatibility(accountAdapter),
            ]);
          if (sequence !== liveHydrationSequenceRef.current || modeRef.current !== 'live') return;
          const apiHistory = liveHistory.data.flatMap((item) => {
            const primaryCategory = item.exercises[0]?.category;
            if (primaryCategory === undefined) return [];
            const category: WorkoutHistoryItem['category'] = primaryCategory;
            const mapped = mapLiveHistoryItemToUi(item, { category, fallbackFormScore: 0 });
            return [
              {
                ...mapped,
                trackingEnabled: item.analyses.some(
                  ({ analysis }) =>
                    analysis !== null &&
                    (analysis.rangeOfMotion.averageDeg !== null ||
                      analysis.movementAccuracy !== null ||
                      analysis.movementControl !== null ||
                      analysis.stability !== null ||
                      analysis.tempo.meanSeconds !== null),
                ),
              },
            ];
          });
          const localHistory = readLiveLocalHistory(accountId);

          liveAccountIdRef.current = accountId;
          liveAuthRef.current = { accountId, accessToken };
          setLiveAccountId(accountId);
          setUser(liveUser);
          setMovementProfile(liveMovementProfile);
          setMovementProfileSync('saved');
          setExercises(liveExercises);
          setProgress(mergeLiveProgress(liveProgress, localHistory));
          setHistory(mergeLiveHistory(apiHistory, localHistory));
          setCoveredRegions([]);
          setFavorites(new Set());
          setAuthenticated(true);
          setLiveDataStatus('ready');
          setLiveDataError(null);
        } catch (error) {
          if (sequence === liveHydrationSequenceRef.current && modeRef.current === 'live') {
            clearLiveUi(
              'error',
              error instanceof Error
                ? error.message
                : 'Live account data could not be loaded. Try again.',
            );
          }
          throw error;
        }
      })();
      const entry = { accountId, accessToken, promise };
      liveHydrationPromiseRef.current = entry;
      void promise
        .finally(() => {
          if (liveHydrationPromiseRef.current === entry) liveHydrationPromiseRef.current = null;
        })
        .catch(() => undefined);
      return promise;
    },
    [clearLiveUi, loadLiveExerciseCompatibility],
  );

  useEffect(() => {
    if (supabase === null || mode !== 'live') return;
    let active = true;
    setLiveDataStatus('loading');
    setLiveDataError(null);
    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error !== null) {
        clearLiveUi('error', error.message);
        return;
      }
      const accountId = data.session?.user.id;
      const email = data.session?.user.email;
      const accessToken = data.session?.access_token;
      if (accountId === undefined || email === undefined || accessToken === undefined) {
        clearLiveUi('idle');
        return;
      }
      try {
        await hydrateLiveAccount(accountId, email, accessToken);
      } catch {
        // hydrateLiveAccount exposes the recoverable error through context.
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (!active || modeRef.current !== 'live') return;
      if (event === 'SIGNED_OUT') {
        if (signOutOperationRef.current !== null) return;
        authOperationSequenceRef.current += 1;
        clearLiveUi('idle');
        return;
      }
      const accountId = authSession?.user.id;
      const email = authSession?.user.email;
      const accessToken = authSession?.access_token;
      if (accountId === undefined || email === undefined || accessToken === undefined) return;
      if (accountId === liveAccountIdRef.current && event === 'TOKEN_REFRESHED') {
        liveAuthRef.current = { accountId, accessToken };
        return;
      }
      void hydrateLiveAccount(accountId, email, accessToken).catch(() => undefined);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [clearLiveUi, hydrateLiveAccount, mode]);

  useEffect(() => {
    try {
      localStorage.setItem(modeStorageKey, mode);
    } catch {
      // Mode selection remains valid for this tab when storage is unavailable.
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'demo') return;
    try {
      localStorage.setItem(
        demoStorageKey,
        JSON.stringify({
          user,
          authenticated,
          favorites: [...favorites],
          profile: movementProfile,
          history,
          progress,
          coveredRegions,
        } satisfies StoredState),
      );
    } catch {
      // Keep the in-memory demo usable when storage is blocked or full.
    }
  }, [authenticated, coveredRegions, favorites, history, mode, movementProfile, progress, user]);

  useEffect(() => {
    if (mode !== 'live' || !authenticated || liveDataStatus !== 'ready' || liveAccountId === null) {
      return;
    }
    if (!history.some((item) => item.id.startsWith(liveLocalHistoryIdPrefix))) return;
    const result = writeLiveLocalHistory(liveAccountId, history);
    if (!result.ok) {
      setLiveDataStatus('error');
      setLiveDataError(
        `This workout is still available in this tab, but it could not be saved to browser storage: ${result.error}`,
      );
      return;
    }
    setHistory((current) => {
      const currentIds = new Set(current.map((item) => item.id));
      if (result.history.every((item) => currentIds.has(item.id))) return current;
      return mergeLiveHistory(current, result.history);
    });
  }, [authenticated, history, liveAccountId, liveDataStatus, mode]);

  useEffect(() => {
    if (session.status !== 'active') return;
    const interval = window.setInterval(() => {
      setSession((current) => ({ ...current, elapsedSeconds: current.elapsedSeconds + 1 }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [session.status]);

  const advanceAfterTarget = useCallback(() => {
    setSession((current) => {
      if (current.set >= current.totalSets) {
        return { ...current, reps: current.targetReps, status: 'complete' };
      }
      return { ...current, reps: current.targetReps, status: 'resting', restSeconds: 45 };
    });
  }, []);

  useEffect(() => {
    if (mode !== 'demo' || session.status !== 'active' || !session.trackingEnabled) return;
    const interval = window.setInterval(() => {
      setSession((current) => {
        if (current.status !== 'active' || current.reps >= current.targetReps) return current;
        const nextReps = current.reps + 1;
        return {
          ...current,
          reps: nextReps,
          formScore: Math.max(88, Math.min(96, current.formScore + (nextReps % 2 === 0 ? 1 : -1))),
          rangeOfMotion: Math.max(
            78,
            Math.min(94, current.rangeOfMotion + (nextReps % 3 === 0 ? 2 : -1)),
          ),
        };
      });
    }, 2600);
    return () => window.clearInterval(interval);
  }, [mode, session.status, session.trackingEnabled]);

  useEffect(() => {
    if (session.status === 'active' && session.reps >= session.targetReps) {
      const timeout = window.setTimeout(advanceAfterTarget, 450);
      return () => window.clearTimeout(timeout);
    }
  }, [advanceAfterTarget, session.reps, session.status, session.targetReps]);

  useEffect(() => {
    if (session.status !== 'resting') return;
    const interval = window.setInterval(() => {
      setSession((current) => ({ ...current, restSeconds: Math.max(0, current.restSeconds - 1) }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [session.status]);

  const selectedExercise =
    exercises.find((exercise) => exercise.slug === selectedExerciseSlug) ?? exercises[0];
  if (selectedExercise === undefined) {
    throw new Error('AdaptFit requires at least one exercise.');
  }

  const setMode = useCallback(
    (nextMode: ApiMode) => {
      const resolvedMode = nextMode === 'live' && !hasLiveConfiguration ? 'demo' : nextMode;
      if (resolvedMode === mode) return;
      setModeState(resolvedMode);

      if (resolvedMode === 'live') {
        clearLiveUi('loading');
        return;
      }

      liveHydrationSequenceRef.current += 1;
      liveHydrationPromiseRef.current = null;
      movementSaveSequenceRef.current += 1;
      movementSaveQueueRef.current = Promise.resolve();
      sessionRecordedRef.current = false;
      liveAccountIdRef.current = null;
      liveAuthRef.current = null;
      setLiveAccountId(null);
      setLiveDataStatus('idle');
      setLiveDataError(null);
      setCameraStream((current) => {
        current?.getTracks().forEach((track) => {
          track.stop();
        });
        return null;
      });
      setCameraError(null);
      setSession(initialSession);
      setLastCompletedHistoryId(null);
      setMovementProfileSync('idle');
      setExercises(demoExercises);
      const demoState = readStoredState();
      setAuthenticated(demoState.authenticated ?? false);
      setUser(demoState.user ?? { displayName: 'Jordan Lee', email: 'jordan.lee@example.com' });
      setMovementProfile(demoState.profile ?? initialMovementProfile);
      setFavorites(new Set(demoState.favorites ?? []));
      setHistory(demoState.history ?? demoHistory);
      setProgress(demoState.progress ?? demoProgress);
      setCoveredRegions(demoState.coveredRegions ?? initialCoveredRegions);
    },
    [clearLiveUi, mode],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (mode === 'live' && supabase !== null) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error !== null) return { ok: false, message: error.message };
        if (data.user === null || data.session === null) {
          return { ok: false, message: 'Supabase did not return an authenticated session.' };
        }
        try {
          await hydrateLiveAccount(
            data.user.id,
            data.user.email ?? email,
            data.session.access_token,
          );
        } catch {
          const { error: signOutError } = await supabase.auth.signOut();
          return {
            ok: false,
            message:
              signOutError === null
                ? 'Your account signed in, but AdaptFit could not load its data. Try again.'
                : 'Your account data could not be loaded, and sign-out also failed. Refresh before trying again.',
          };
        }
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        setUser((current) => ({ ...current, email }));
        setAuthenticated(true);
      }
      return { ok: true };
    },
    [hydrateLiveAccount, mode],
  );

  const signUp = useCallback(
    async (displayName: string, email: string, password: string): Promise<AuthResult> => {
      if (mode === 'live' && supabase !== null) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error !== null) return { ok: false, message: error.message };
        if (data.session === null) {
          return { ok: false, message: 'Check your email to confirm your account, then sign in.' };
        }
        if (data.user === null) {
          const { error: signOutError } = await supabase.auth.signOut();
          return {
            ok: false,
            message:
              signOutError === null
                ? 'Your account was created without an active user session. Sign in again.'
                : 'Your account was created without a usable session, and sign-out failed. Refresh before trying again.',
          };
        }
        try {
          await hydrateLiveAccount(
            data.user.id,
            data.user.email ?? email,
            data.session.access_token,
          );
        } catch {
          const { error: signOutError } = await supabase.auth.signOut();
          return {
            ok: false,
            message:
              signOutError === null
                ? 'Your account was created, but AdaptFit could not load its data. Sign in again.'
                : 'Your account was created, but its data and sign-out could not complete. Refresh before trying again.',
          };
        }
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        setUser({ displayName, email });
        setAuthenticated(true);
      }
      return { ok: true };
    },
    [hydrateLiveAccount, mode],
  );

  const signOut = useCallback(async () => {
    if (mode === 'live' && supabase !== null) {
      const { error } = await supabase.auth.signOut();
      if (error !== null) throw error;
      clearLiveUi('idle');
      return;
    }
    setAuthenticated(false);
  }, [clearLiveUi, mode]);

  const retryLiveData = useCallback(async () => {
    if (mode !== 'live' || supabase === null) return;
    setLiveDataStatus('loading');
    setLiveDataError(null);
    const { data, error } = await supabase.auth.getSession();
    if (error !== null) {
      clearLiveUi('error', error.message);
      throw error;
    }
    const accountId = data.session?.user.id;
    const email = data.session?.user.email;
    const accessToken = data.session?.access_token;
    if (accountId === undefined || email === undefined || accessToken === undefined) {
      const sessionError = new Error('Your live session is unavailable. Sign in again.');
      clearLiveUi('error', sessionError.message);
      throw sessionError;
    }
    await hydrateLiveAccount(accountId, email, accessToken);
  }, [clearLiveUi, hydrateLiveAccount, mode]);

  const saveUser = useCallback(
    async (nextUser: UserProfile): Promise<AuthResult> => {
      if (mode !== 'live') {
        setUser(nextUser);
        return { ok: true };
      }
      const credentials = liveAuthRef.current;
      if (credentials === null || liveAccountIdRef.current !== credentials.accountId) {
        return { ok: false, message: 'Your live account is not ready. Refresh and try again.' };
      }
      const safeUser = { ...nextUser, email: user.email };
      try {
        const accountAdapter = liveAdapterForAccessToken(credentials.accessToken);
        const savedUser = await accountAdapter.saveUserProfile(safeUser, user.email);
        if (liveAccountIdRef.current !== credentials.accountId) {
          return {
            ok: false,
            message: 'The active live account changed before the save finished.',
          };
        }
        setUser(savedUser);
        return { ok: true };
      } catch {
        return {
          ok: false,
          message: 'Your profile could not be saved. Check your connection and try again.',
        };
      }
    },
    [mode, user.email],
  );

  const queueLiveMovementProfileSave = useCallback(
    (nextProfile: MovementProfile) => {
      if (mode !== 'live' || !authenticated) return;
      const accountId = liveAccountIdRef.current;
      if (accountId === null) return;
      const sequence = movementSaveSequenceRef.current + 1;
      movementSaveSequenceRef.current = sequence;
      setMovementProfileSync('saving');
      setExercises(unverifiedLiveExercises);
      setLiveDataStatus('loading');
      setLiveDataError(null);
      movementSaveQueueRef.current = movementSaveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (
            sequence !== movementSaveSequenceRef.current ||
            liveAccountIdRef.current !== accountId
          ) {
            return;
          }
          try {
            const credentials = liveAuthRef.current;
            if (credentials === null || credentials.accountId !== accountId) return;
            const accountAdapter = liveAdapterForAccessToken(credentials.accessToken);
            const saved = await accountAdapter.saveMovementProfile(nextProfile);
            if (
              sequence !== movementSaveSequenceRef.current ||
              liveAccountIdRef.current !== accountId
            ) {
              return;
            }
            const liveExercises = await loadLiveExerciseCompatibility(accountAdapter);
            if (
              sequence === movementSaveSequenceRef.current &&
              liveAccountIdRef.current === accountId
            ) {
              setMovementProfile(saved);
              setExercises(liveExercises);
              setMovementProfileSync('saved');
              setLiveDataStatus('ready');
            }
          } catch {
            if (
              sequence === movementSaveSequenceRef.current &&
              liveAccountIdRef.current === accountId
            ) {
              setMovementProfileSync('error');
              setLiveDataStatus('error');
              setLiveDataError(
                'Movement preferences could not be saved. Retry before relying on compatibility.',
              );
            }
          }
        });
    },
    [authenticated, loadLiveExerciseCompatibility, mode],
  );

  const updateRegion = useCallback(
    (region: string) => {
      const activeKey = constraintMode === 'focus' ? 'focusRegions' : 'avoidRegions';
      const otherKey = constraintMode === 'focus' ? 'avoidRegions' : 'focusRegions';
      const active = movementProfile[activeKey];
      const nextActive = active.includes(region)
        ? active.filter((item) => item !== region)
        : [...active, region];
      const nextProfile = {
        ...movementProfile,
        [activeKey]: nextActive,
        [otherKey]: movementProfile[otherKey].filter((item) => item !== region),
        version: movementProfile.version + 1,
      };
      setMovementProfile(nextProfile);
      queueLiveMovementProfileSave(nextProfile);
    },
    [constraintMode, movementProfile, queueLiveMovementProfileSave],
  );

  const resetRegions = useCallback(() => {
    const nextProfile = {
      ...movementProfile,
      focusRegions: [],
      avoidRegions: [],
      version: movementProfile.version + 1,
    };
    setMovementProfile(nextProfile);
    queueLiveMovementProfileSave(nextProfile);
  }, [movementProfile, queueLiveMovementProfileSave]);

  const selectExercise = useCallback(
    (slug: string) => {
      if (exercises.some((exercise) => exercise.slug === slug)) setSelectedExerciseSlug(slug);
    },
    [exercises],
  );

  const toggleFavorite = useCallback((slug: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const requestCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera access is not available in this browser. You can continue without tracking.',
      );
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream((current) => {
        current?.getTracks().forEach((track) => {
          track.stop();
        });
        return stream;
      });
      return true;
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera permission was not granted. You can continue without tracking.'
          : 'The camera could not be started. Check that another app is not using it.';
      setCameraError(message);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    setCameraStream((current) => {
      current?.getTracks().forEach((track) => {
        track.stop();
      });
      return null;
    });
  }, []);

  const buildWorkout = useCallback(
    (trackingEnabled: boolean) => {
      sessionRecordedRef.current = false;
      setSession({
        ...initialSession,
        status: 'building',
        exerciseSlug: selectedExercise.slug,
        totalSets: selectedExercise.defaultSets,
        targetReps: selectedExercise.defaultReps,
        restSeconds: selectedExercise.restSeconds,
        trackingEnabled: mode === 'demo' && trackingEnabled,
      });
    },
    [mode, selectedExercise],
  );

  const beginExercise = useCallback(() => {
    setSession((current) => ({ ...current, status: 'active' }));
  }, []);

  const addRep = useCallback(() => {
    setSession((current) => ({
      ...current,
      reps: Math.min(current.targetReps, current.reps + 1),
    }));
  }, []);

  const pauseExercise = useCallback(() => {
    setSession((current) => ({ ...current, status: 'paused' }));
  }, []);

  const resumeExercise = useCallback(() => {
    setSession((current) => ({ ...current, status: 'active' }));
  }, []);

  const restartSet = useCallback(() => {
    setSession((current) => ({ ...current, reps: 0, status: 'active' }));
  }, []);

  const addRestTime = useCallback(() => {
    setSession((current) => ({ ...current, restSeconds: current.restSeconds + 15 }));
  }, []);

  const continueAfterRest = useCallback(() => {
    setSession((current) => ({
      ...current,
      status: 'active',
      set: Math.min(current.totalSets, current.set + 1),
      reps: 0,
    }));
  }, []);

  const skipRest = continueAfterRest;

  const endExercise = useCallback(() => {
    setSession((current) => ({ ...current, status: 'complete' }));
  }, []);

  useEffect(() => {
    if (session.status !== 'complete' || sessionRecordedRef.current) return;
    sessionRecordedRef.current = true;
    const now = new Date().toISOString();
    const completedReps = Math.min(
      session.totalSets * session.targetReps,
      session.reps + (session.set - 1) * session.targetReps,
    );
    const completedSets = Math.max(0, session.set - 1 + (session.reps > 0 ? 1 : 0));
    const completedExercise = completedReps > 0 ? 1 : 0;
    if (completedReps === 0) {
      setLastCompletedHistoryId(null);
      return;
    }
    const item: StoredLiveHistoryItem = {
      id: `${mode === 'live' ? liveLocalHistoryIdPrefix : 'history-'}${crypto.randomUUID()}`,
      title: selectedExercise.name,
      category: selectedExercise.bodyRegions.includes('Core') ? 'core' : selectedExercise.category,
      completedAt: now,
      completedReps,
      targetReps: session.totalSets * session.targetReps,
      durationSeconds: session.elapsedSeconds,
      formScore: session.trackingEnabled ? session.formScore : 0,
      trackingEnabled: session.trackingEnabled,
      completedSets,
    };
    setLastCompletedHistoryId(item.id);
    setHistory((current) => [item, ...current]);
    const nextCoveredRegions =
      mode === 'demo'
        ? [...new Set([...coveredRegions, ...selectedExercise.bodyRegions])]
        : coveredRegions;
    if (mode === 'demo') setCoveredRegions(nextCoveredRegions);
    const trackedScores = history
      .filter((historyItem) => historyItem.trackingEnabled === true)
      .map((historyItem) => historyItem.formScore);
    const nextAverageFormScore = session.trackingEnabled
      ? Math.round(
          (trackedScores.reduce((total, score) => total + score, 0) + session.formScore) /
            (trackedScores.length + 1),
        )
      : undefined;
    setProgress((current) => ({
      ...current,
      totalSeconds: current.totalSeconds + item.durationSeconds,
      exercisesCompleted: current.exercisesCompleted + completedExercise,
      totalReps: current.totalReps + completedReps,
      totalSets: current.totalSets + completedSets,
      weeklyWorkouts: current.weeklyWorkouts + completedExercise,
      weeklySeconds: current.weeklySeconds + item.durationSeconds,
      weeklyReps: current.weeklyReps + completedReps,
      weeklySets: current.weeklySets + completedSets,
      bodyCoverage:
        mode === 'demo'
          ? Math.round((nextCoveredRegions.length / bodyRegions.length) * 100)
          : current.bodyCoverage,
      averageFormScore: nextAverageFormScore ?? current.averageFormScore,
    }));
  }, [coveredRegions, history, mode, selectedExercise, session]);

  const resetSession = useCallback(() => {
    setSession(initialSession);
    setLastCompletedHistoryId(null);
    sessionRecordedRef.current = false;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const value = useMemo<AppContextValue>(
    () => ({
      mode,
      isLiveAvailable: hasLiveConfiguration,
      authenticated,
      user,
      exercises,
      regions: bodyRegions,
      movementProfile,
      constraintMode,
      selectedExercise,
      favorites,
      session,
      history,
      progress,
      cameraStream,
      cameraError,
      lastCompletedHistoryId,
      movementProfileSync,
      liveDataStatus,
      liveDataError,
      retryLiveData,
      setMode,
      signIn,
      signUp,
      signOut,
      saveUser,
      setConstraintMode,
      updateRegion,
      resetRegions,
      selectExercise,
      toggleFavorite,
      requestCamera,
      stopCamera,
      buildWorkout,
      beginExercise,
      addRep,
      pauseExercise,
      resumeExercise,
      restartSet,
      addRestTime,
      skipRest,
      continueAfterRest,
      endExercise,
      resetSession,
    }),
    [
      addRep,
      addRestTime,
      authenticated,
      beginExercise,
      buildWorkout,
      cameraError,
      cameraStream,
      constraintMode,
      continueAfterRest,
      endExercise,
      exercises,
      favorites,
      history,
      lastCompletedHistoryId,
      liveDataError,
      liveDataStatus,
      mode,
      movementProfile,
      movementProfileSync,
      pauseExercise,
      progress,
      requestCamera,
      resetRegions,
      resetSession,
      retryLiveData,
      restartSet,
      resumeExercise,
      saveUser,
      selectExercise,
      selectedExercise,
      session,
      setMode,
      signIn,
      signOut,
      signUp,
      skipRest,
      stopCamera,
      toggleFavorite,
      updateRegion,
      user,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const value = useContext(AppContext);
  if (value === null) throw new Error('useApp must be used inside AppProvider.');
  return value;
};
