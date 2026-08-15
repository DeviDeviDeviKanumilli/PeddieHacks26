import { AlertTriangle, Cloud, LogIn, RefreshCw } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark, Button } from './components/ui';
import {
  CameraPermissionScreen,
  CameraSetupScreen,
  ExerciseLoadErrorScreen,
  WorkoutBuildingScreen,
} from './screens/camera';
import { DiscoveryScreen, ExerciseCardScreen, ExerciseSelectionScreen } from './screens/discovery';
import { CompatibilityWarningScreen, ExerciseDetailScreen } from './screens/exercise';
import { HomeScreen } from './screens/home';
import { AuthScreen, ProfileSummaryScreen, WelcomeScreen } from './screens/onboarding';
import {
  AccessibilityScreen,
  EditMovementProfileScreen,
  EquipmentScreen,
  GoalsScreen,
  MovementMapScreen,
  MovementStylesScreen,
} from './screens/profileSetup';
import { DashboardScreen, DetailedAnalysisScreen, HistoryScreen } from './screens/progress';
import {
  ActiveExerciseScreen,
  ExerciseCompletedScreen,
  PausedExerciseScreen,
  RestScreen,
} from './screens/session';
import {
  ActivePlanScreen,
  BuildWorkoutScreen,
  RecommendedWorkoutScreen,
  SwapExerciseScreen,
  WorkoutCompleteScreen,
} from './screens/workoutPlan';
import { useApp } from './state/AppContext';
import type { SessionStatus } from './types';

const RouteEffects = () => {
  const { pathname } = useLocation();
  const { stopCamera } = useApp();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });

    const keepsCameraActive =
      pathname.startsWith('/camera/') ||
      pathname === '/workout/building' ||
      /^\/session\/(active|paused|rest)$/.test(pathname);
    if (!keepsCameraActive) stopCamera();

    const timeout = window.setTimeout(() => {
      const main = document.querySelector<HTMLElement>('main');
      main?.setAttribute('tabindex', '-1');
      main?.focus({ preventScroll: true });
      const pageTitle = main?.querySelector('h1')?.textContent ?? 'AdaptFit';
      document.title = pageTitle === 'AdaptFit' ? pageTitle : `${pageTitle} | AdaptFit`;
      setAnnouncement(pageTitle);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [pathname, stopCamera]);

  return (
    <span className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </span>
  );
};

const sessionPathByStatus: Partial<Record<SessionStatus, string>> = {
  building: '/workout/building',
  active: '/session/active',
  paused: '/session/paused',
  resting: '/session/rest',
  complete: '/session/complete',
};

const SessionRoute = ({ expected, children }: { expected: SessionStatus; children: ReactNode }) => {
  const { session } = useApp();
  if (session.status === expected) return children;
  return <Navigate to={sessionPathByStatus[session.status] ?? '/exercises'} replace />;
};

const CameraEntryRoute = ({ children }: { children: ReactNode }) => {
  const { session } = useApp();
  if (session.status === 'idle') return children;
  return <Navigate to={sessionPathByStatus[session.status] ?? '/exercises'} replace />;
};

const WorkoutLoadErrorRoute = ({ children }: { children: ReactNode }) => {
  const { session } = useApp();
  const { state } = useLocation();
  const hasFailureContext =
    typeof state === 'object' &&
    state !== null &&
    (state as Record<string, unknown>).workoutLoadFailed === true;
  if (session.status === 'building' && hasFailureContext) return children;
  return <Navigate to={sessionPathByStatus[session.status] ?? '/exercises'} replace />;
};

const liveStateShellStyle: CSSProperties = {
  display: 'grid',
  minHeight: '100dvh',
  padding: 'clamp(1rem, 5vw, 3rem)',
  placeItems: 'center',
};

const liveStatePanelStyle: CSSProperties = {
  display: 'grid',
  width: 'min(100%, 32rem)',
  justifyItems: 'center',
  padding: 'clamp(1.5rem, 6vw, 2.75rem)',
  textAlign: 'center',
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-md)',
};

const liveStateIconStyle: CSSProperties = {
  display: 'grid',
  width: '4rem',
  height: '4rem',
  margin: '1.75rem 0 1.1rem',
  color: 'var(--accent-strong)',
  background: 'var(--accent-soft)',
  borderRadius: '50%',
  placeItems: 'center',
};

const liveStateCopyStyle: CSSProperties = {
  maxWidth: '38ch',
  margin: 0,
  color: 'var(--muted)',
};

const liveStateActionsStyle: CSSProperties = {
  display: 'grid',
  width: '100%',
  gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
  gap: '0.7rem',
  marginTop: '1.5rem',
};

const LiveLoadingScreen = () => (
  <main style={liveStateShellStyle} tabIndex={-1}>
    <div
      style={liveStatePanelStyle}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
    >
      <BrandMark />
      <span style={liveStateIconStyle} aria-hidden="true">
        <Cloud size={30} />
      </span>
      <h1>Loading your AdaptFit data</h1>
      <p style={liveStateCopyStyle}>
        We are securely preparing your movement profile, exercises, and progress.
      </p>
      <span
        className="button__loader"
        style={{ display: 'inline-block', marginTop: '1.5rem', color: 'var(--accent-strong)' }}
        aria-hidden="true"
      />
    </div>
  </main>
);

const LiveRecoveryScreen = ({
  error,
  onRetry,
  onSignIn,
}: {
  error: string;
  onRetry: () => void;
  onSignIn: () => void;
}) => (
  <main style={liveStateShellStyle} tabIndex={-1}>
    <div style={liveStatePanelStyle} role="alert" aria-labelledby="live-data-error-title">
      <BrandMark />
      <span
        style={{ ...liveStateIconStyle, color: 'var(--danger)', background: 'var(--danger-soft)' }}
        aria-hidden="true"
      >
        <AlertTriangle size={30} />
      </span>
      <p className="eyebrow">Your local demo data is not being shown</p>
      <h1 id="live-data-error-title">We could not load your live data</h1>
      <p style={liveStateCopyStyle}>{error}</p>
      <div style={liveStateActionsStyle}>
        <Button type="button" icon={<RefreshCw size={19} />} onClick={onRetry}>
          Retry
        </Button>
        <Button type="button" variant="secondary" icon={<LogIn size={19} />} onClick={onSignIn}>
          Return to Sign In
        </Button>
      </div>
    </div>
  </main>
);

const LiveSignInScreen = ({ onSignIn }: { onSignIn: () => void }) => (
  <main style={liveStateShellStyle} tabIndex={-1}>
    <div
      style={liveStatePanelStyle}
      role="status"
      aria-live="polite"
      aria-labelledby="live-sign-in-title"
    >
      <BrandMark />
      <span style={liveStateIconStyle} aria-hidden="true">
        <LogIn size={30} />
      </span>
      <h1 id="live-sign-in-title">Sign in to view live data</h1>
      <p style={liveStateCopyStyle}>
        This route is waiting for a verified AdaptFit account. No demo profile or progress is shown
        in live mode.
      </p>
      <div style={liveStateActionsStyle}>
        <Button type="button" icon={<LogIn size={19} />} onClick={onSignIn}>
          Go to Sign In
        </Button>
      </div>
    </div>
  </main>
);

const LiveDataBoundary = ({ children }: { children: ReactNode }) => {
  const { mode, liveDataStatus, liveDataError, retryLiveData } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isEntryRoute =
    pathname === '/' ||
    pathname === '/welcome' ||
    pathname.startsWith('/welcome/') ||
    pathname === '/sign-in' ||
    pathname.startsWith('/sign-in/');
  const isLiveRoute = mode === 'live' && !isEntryRoute;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const main = document.querySelector<HTMLElement>('main');
      main?.focus({ preventScroll: true });
      const title = main?.querySelector('h1')?.textContent;
      if (title !== undefined && title !== null) {
        document.title = `${title} | AdaptFit`;
      } else if (isLiveRoute && liveDataStatus !== 'ready') {
        document.title = 'Live Data | AdaptFit';
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isLiveRoute, liveDataStatus]);

  if (!isLiveRoute || liveDataStatus === 'ready') return children;
  if (liveDataStatus === 'error') {
    return (
      <LiveRecoveryScreen
        error={liveDataError ?? 'Your live account data is temporarily unavailable.'}
        onRetry={() => void retryLiveData().catch(() => undefined)}
        onSignIn={() => navigate('/sign-in', { replace: true })}
      />
    );
  }
  if (liveDataStatus === 'idle') {
    return <LiveSignInScreen onSignIn={() => navigate('/sign-in', { replace: true })} />;
  }
  return <LiveLoadingScreen />;
};

export const App = () => (
  <>
    <RouteEffects />
    <LiveDataBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/sign-in" element={<AuthScreen />} />
        <Route path="/onboarding" element={<Navigate to="/onboarding/goals" replace />} />
        <Route path="/onboarding/goals" element={<GoalsScreen />} />
        <Route path="/onboarding/movement" element={<MovementMapScreen />} />
        <Route path="/onboarding/styles" element={<MovementStylesScreen />} />
        <Route path="/onboarding/equipment" element={<EquipmentScreen />} />
        <Route path="/onboarding/accessibility" element={<AccessibilityScreen />} />
        <Route path="/profile/movement" element={<EditMovementProfileScreen />} />
        <Route path="/build" element={<BuildWorkoutScreen />} />
        <Route path="/workout/recommended" element={<RecommendedWorkoutScreen />} />
        <Route path="/workout/plan" element={<ActivePlanScreen />} />
        <Route path="/workout/plan/:itemId/swap" element={<SwapExerciseScreen />} />
        <Route path="/workout/complete" element={<WorkoutCompleteScreen />} />
        <Route path="/discover" element={<DiscoveryScreen />} />
        <Route path="/exercises" element={<ExerciseSelectionScreen />} />
        <Route path="/exercises/:slug/card" element={<ExerciseCardScreen />} />
        <Route path="/exercises/:slug" element={<ExerciseDetailScreen />} />
        <Route path="/exercises/:slug/compatibility" element={<CompatibilityWarningScreen />} />
        <Route path="/profile/summary" element={<ProfileSummaryScreen />} />
        <Route
          path="/camera/permission"
          element={
            <CameraEntryRoute>
              <CameraPermissionScreen />
            </CameraEntryRoute>
          }
        />
        <Route
          path="/camera/setup"
          element={
            <CameraEntryRoute>
              <CameraSetupScreen />
            </CameraEntryRoute>
          }
        />
        <Route
          path="/workout/building"
          element={
            <SessionRoute expected="building">
              <WorkoutBuildingScreen />
            </SessionRoute>
          }
        />
        <Route
          path="/session/active"
          element={
            <SessionRoute expected="active">
              <ActiveExerciseScreen />
            </SessionRoute>
          }
        />
        <Route
          path="/session/paused"
          element={
            <SessionRoute expected="paused">
              <PausedExerciseScreen />
            </SessionRoute>
          }
        />
        <Route
          path="/session/rest"
          element={
            <SessionRoute expected="resting">
              <RestScreen />
            </SessionRoute>
          }
        />
        <Route
          path="/session/error"
          element={
            <WorkoutLoadErrorRoute>
              <ExerciseLoadErrorScreen />
            </WorkoutLoadErrorRoute>
          }
        />
        <Route
          path="/session/complete"
          element={
            <SessionRoute expected="complete">
              <ExerciseCompletedScreen />
            </SessionRoute>
          }
        />
        {/*
         * The PDF's Home lives at /dashboard so every existing link keeps working; the
         * analytics dashboard the team preferred moves under the Progress tab, which the
         * PDF's nav has but never designs a screen for.
         */}
        <Route path="/dashboard" element={<HomeScreen />} />
        <Route path="/progress" element={<DashboardScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/analysis/:id" element={<DetailedAnalysisScreen />} />
        <Route path="*" element={<Navigate to="/exercises" replace />} />
      </Routes>
    </LiveDataBoundary>
  </>
);
