import {
  Activity,
  AlertCircle,
  Camera,
  CircleGauge,
  House,
  Info,
  Lightbulb,
  LockKeyhole,
  RefreshCw,
  ScanLine,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppHeader, BrandMark, Button, Page, PageIntro, Skeleton } from '../components/ui';
import { CameraPreview, ProgressRing, ReadyRow } from '../components/visuals';
import { useApp } from '../state/AppContext';
import type { SessionStatus } from '../types';
import './camera.css';

const forcedLoadErrorKey = 'adaptfit-force-load-error';
const cameraSetupConsentKey = 'adaptfit-camera-setup-consent-v1';
let cameraSetupConsent: string | null = null;
let cameraSetupConsentSequence = 0;

const issueCameraSetupConsent = (): string => {
  cameraSetupConsentSequence += 1;
  const token = `${Date.now().toString(36)}-${cameraSetupConsentSequence.toString(36)}`;
  cameraSetupConsent = token;
  try {
    window.sessionStorage.setItem(cameraSetupConsentKey, token);
  } catch {
    // The in-memory token still protects setup navigation for this page lifetime.
  }
  return token;
};

const hasCameraSetupConsent = (token: string | null): token is string => {
  if (token === null) return false;
  if (cameraSetupConsent === token) return true;
  try {
    return window.sessionStorage.getItem(cameraSetupConsentKey) === token;
  } catch {
    return false;
  }
};

const clearCameraSetupConsent = (token?: string): void => {
  if (token === undefined || cameraSetupConsent === token) cameraSetupConsent = null;
  try {
    if (token === undefined || window.sessionStorage.getItem(cameraSetupConsentKey) === token) {
      window.sessionStorage.removeItem(cameraSetupConsentKey);
    }
  } catch {
    // Consent also expires through the in-memory token when storage is unavailable.
  }
};

const consentTokenFromLocationState = (state: unknown): string | null => {
  if (typeof state !== 'object' || state === null) return null;
  const token = (state as Record<string, unknown>).cameraConsentToken;
  return typeof token === 'string' ? token : null;
};

const cameraExitPathBySessionStatus: Partial<Record<SessionStatus, string>> = {
  building: '/workout/building',
  active: '/session/active',
  paused: '/session/paused',
  resting: '/session/rest',
  complete: '/session/complete',
};

const hasForcedLoadError = (): boolean => {
  try {
    return window.sessionStorage.getItem(forcedLoadErrorKey) !== null;
  } catch {
    return false;
  }
};

const clearForcedLoadError = (): void => {
  try {
    window.sessionStorage.removeItem(forcedLoadErrorKey);
  } catch {
    // The retry still works when browser storage is unavailable.
  }
};

const CameraPermissionVisual = () => (
  <div className="camera-permission-visual" aria-hidden="true">
    <span className="camera-visual-chart camera-visual-chart-left">
      <i />
      <i />
      <i />
      <i />
    </span>
    <span className="camera-visual-chart camera-visual-chart-right">
      <i />
      <i />
      <i />
      <i />
    </span>
    <img src="/assets/bodyweight-squat.png" alt="" />
    <svg className="camera-permission-pose" viewBox="0 0 100 100" preserveAspectRatio="none">
      <title>Decorative pose guide</title>
      <g>
        <path d="M53 16 48 29 39 35 51 43 59 34 67 43M48 29 47 53 37 62 32 82M47 53 58 62 61 82" />
        {[
          [53, 16],
          [48, 29],
          [39, 35],
          [59, 34],
          [51, 43],
          [67, 43],
          [47, 53],
          [37, 62],
          [58, 62],
          [32, 82],
          [61, 82],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.25" />
        ))}
      </g>
      <path className="camera-permission-frame" d="M8 18V8h10M82 8h10v10M8 82v10h10M92 82v10H82" />
    </svg>
  </div>
);

const permissionBenefits = [
  {
    title: 'Positioning Preview',
    description:
      'Shows a live positioning preview with a decorative guide. This demo does not analyze body points.',
    icon: <ScanLine size={24} />,
  },
  {
    title: 'Simulated Rep Counting',
    description:
      'Demonstrates the rep-counting interface with locally timed sample data that is independent of the camera.',
    icon: <CircleGauge size={24} />,
  },
  {
    title: 'Sample Feedback',
    description:
      'Shows sample coaching feedback so you can explore the workout experience without video analysis.',
    icon: <Activity size={24} />,
  },
];

export const CameraPermissionScreen = () => {
  const navigate = useNavigate();
  const { buildWorkout, cameraError, mode, requestCamera, stopCamera } = useApp();
  const [isRequesting, setIsRequesting] = useState(false);
  const cameraErrorId = useId();
  const mountedRef = useRef(true);
  const liveBypassStartedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    clearCameraSetupConsent();
    if (mode !== 'live' || liveBypassStartedRef.current) return;
    liveBypassStartedRef.current = true;
    stopCamera();
    buildWorkout(false);
    navigate('/workout/building', { replace: true });
  }, [buildWorkout, mode, navigate, stopCamera]);

  const allowCamera = async () => {
    if (isRequesting) return;
    setIsRequesting(true);
    const granted = await requestCamera();
    if (!mountedRef.current) {
      if (granted) stopCamera();
      return;
    }
    if (granted) {
      const cameraConsentToken = issueCameraSetupConsent();
      navigate('/camera/setup', { state: { cameraConsentToken } });
      return;
    }
    setIsRequesting(false);
  };

  const continueWithoutCamera = () => {
    clearCameraSetupConsent();
    stopCamera();
    buildWorkout(false);
    navigate('/workout/building');
  };

  if (mode === 'live') {
    return (
      <>
        <AppHeader />
        <Page className="camera-flow camera-loading-page">
          <div className="camera-loading-content" role="status" aria-live="polite">
            <PageIntro
              title="Preparing a manual workout"
              subtitle="Camera tracking is off in live mode. You’ll log reps with the on-screen controls."
              centered
            />
          </div>
        </Page>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <Page className="camera-flow camera-permission">
        <PageIntro
          title="Camera Permission"
          subtitle="Allow camera access to preview your position during this demo workout. Rep counts and form feedback are simulated without using the video."
        />

        <div className="camera-permission-layout">
          <CameraPermissionVisual />

          <div className="camera-permission-details">
            <section className="camera-benefits" aria-label="Demo camera preview features">
              {permissionBenefits.map((benefit) => (
                <article className="camera-benefit" key={benefit.title}>
                  <span className="camera-benefit-icon" aria-hidden="true">
                    {benefit.icon}
                  </span>
                  <div>
                    <h2>{benefit.title}</h2>
                    <p>{benefit.description}</p>
                  </div>
                </article>
              ))}
            </section>

            <p className="camera-privacy-note">
              <span aria-hidden="true">
                <LockKeyhole size={18} />
              </span>
              Video stays in this browser session and is never uploaded, stored, or shared by
              AdaptFit.
            </p>

            <p className="camera-prototype-note">
              <Info size={16} aria-hidden="true" />
              This prototype does not analyze video. Any demo feedback is simulated locally.
            </p>

            {cameraError !== null ? (
              <div className="camera-inline-error" id={cameraErrorId} role="alert">
                <AlertCircle size={19} aria-hidden="true" />
                <span>{cameraError}</span>
              </div>
            ) : null}

            <div className="camera-action-stack">
              <Button
                type="button"
                onClick={() => void allowCamera()}
                loading={isRequesting}
                aria-describedby={cameraError !== null ? cameraErrorId : undefined}
              >
                Allow Camera Access
              </Button>
              <Button type="button" variant="secondary" onClick={continueWithoutCamera}>
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </Page>
    </>
  );
};

const CameraSetupExperience = ({ consentToken }: { consentToken: string }) => {
  const navigate = useNavigate();
  const { buildWorkout, cameraError, cameraStream, mode, requestCamera, stopCamera } = useApp();
  const mountedRef = useRef(true);
  const preserveCameraRef = useRef(false);
  const cleanupTimerRef = useRef<number | undefined>(undefined);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewIssue, setPreviewIssue] = useState<string | null>(null);
  const [lightingReady, setLightingReady] = useState(false);
  const [deviceStable, setDeviceStable] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    window.clearTimeout(cleanupTimerRef.current);
    return () => {
      mountedRef.current = false;
      cleanupTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current) {
          clearCameraSetupConsent(consentToken);
          if (!preserveCameraRef.current) stopCamera();
        }
      }, 0);
    };
  }, [consentToken, stopCamera]);

  useEffect(() => {
    setPreviewReady(false);
    setPreviewIssue(null);
    if (cameraStream === null) return;

    const videoTrack = cameraStream.getVideoTracks()[0];
    if (videoTrack === undefined) return;

    let readyTimer: number | undefined;
    const markReady = () => {
      window.clearTimeout(readyTimer);
      readyTimer = window.setTimeout(() => setPreviewReady(true), 260);
    };
    const markEnded = () => {
      setPreviewReady(false);
      setPreviewIssue('The camera connection ended. Try the camera again or continue without it.');
    };

    videoTrack.addEventListener('unmute', markReady);
    videoTrack.addEventListener('ended', markEnded);
    if (videoTrack.readyState === 'live') markReady();

    return () => {
      window.clearTimeout(readyTimer);
      videoTrack.removeEventListener('unmute', markReady);
      videoTrack.removeEventListener('ended', markEnded);
    };
  }, [cameraStream]);

  useEffect(() => {
    setLightingReady(false);
    setDeviceStable(false);
    if (!previewReady) return;

    const lightingTimer = window.setTimeout(() => setLightingReady(true), 420);
    const stabilityTimer = window.setTimeout(() => setDeviceStable(true), 1450);
    return () => {
      window.clearTimeout(lightingTimer);
      window.clearTimeout(stabilityTimer);
    };
  }, [previewReady]);

  const retryCamera = async () => {
    if (isStartingCamera) return;
    setPreviewIssue(null);
    setIsStartingCamera(true);
    const restored = await requestCamera();
    if (!mountedRef.current) {
      if (restored) stopCamera();
      return;
    }
    if (!restored) {
      setPreviewIssue('The camera could not reconnect. You can retry or continue without it.');
    }
    setIsStartingCamera(false);
  };

  const beginTrackedExercise = () => {
    preserveCameraRef.current = mode === 'demo';
    clearCameraSetupConsent(consentToken);
    if (mode === 'live') stopCamera();
    buildWorkout(true);
    navigate('/workout/building');
  };

  const continueWithoutTracking = () => {
    preserveCameraRef.current = false;
    clearCameraSetupConsent(consentToken);
    stopCamera();
    buildWorkout(false);
    navigate('/workout/building');
  };

  const coachingCue =
    previewIssue ??
    (cameraError !== null
      ? 'Camera preview is unavailable. You can retry or continue without tracking.'
      : !previewReady
        ? 'Move slightly farther back while the preview gets ready.'
        : !lightingReady
          ? 'Face a light source so your movement stays clear.'
          : !deviceStable
            ? 'Keep your device still for a moment.'
            : 'Great positioning. You’re ready to begin.');

  return (
    <>
      <AppHeader />
      <Page className="camera-flow camera-setup">
        <PageIntro
          title="Camera Setup"
          subtitle={
            mode === 'demo'
              ? 'Position yourself in the frame for the demo camera preview.'
              : 'Check your framing before continuing with manual rep counting.'
          }
        />

        <div className="camera-setup-layout">
          <div className="camera-setup-preview-wrap">
            <CameraPreview
              stream={cameraStream}
              variant="standing"
              className={`camera-setup-preview ${previewReady ? 'is-ready' : ''} ${cameraStream === null ? 'is-example' : ''}`}
            />
            {isStartingCamera || cameraStream === null ? (
              <span className="camera-preview-status">
                <Camera size={18} aria-hidden="true" />
                {isStartingCamera ? 'Starting camera' : 'Setup example. Preview unavailable'}
              </span>
            ) : null}
          </div>

          <div className="camera-setup-controls">
            <fieldset className="camera-readiness">
              <legend className="sr-only">Camera readiness</legend>
              <ReadyRow label="Full body visible" ready={previewReady} pending={isStartingCamera} />
              <ReadyRow
                label="Good lighting"
                ready={lightingReady}
                pending={previewReady && !lightingReady}
              />
              <ReadyRow
                label="Device stable"
                ready={deviceStable}
                pending={previewReady && !deviceStable}
              />
              <p className="sr-only">
                Camera preview:{' '}
                {previewReady ? 'connected' : isStartingCamera ? 'checking' : 'not ready'}. Lighting
                guidance: {lightingReady ? 'ready' : previewReady ? 'checking' : 'not ready'}.
                Device stability cue:{' '}
                {deviceStable ? 'ready' : previewReady ? 'checking' : 'not ready'}.
              </p>
            </fieldset>

            <div className="camera-coaching-cue">
              <span aria-hidden="true">
                <Lightbulb size={20} />
              </span>
              <p>{coachingCue}</p>
            </div>

            <p className="camera-readiness-note">
              <Info size={16} aria-hidden="true" />
              These readiness checks are timed setup guidance, not automated pose or lighting
              analysis.
            </p>

            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {coachingCue} Camera preview {previewReady ? 'connected' : 'not ready'}. Lighting
              guidance {lightingReady ? 'ready' : 'checking'}. Device stability cue{' '}
              {deviceStable ? 'ready' : 'checking'}.
            </p>

            {cameraError !== null || previewIssue !== null ? (
              <p className="sr-only" role="alert">
                {previewIssue ?? cameraError}
              </p>
            ) : null}

            {cameraError !== null || previewIssue !== null ? (
              <Button
                className="camera-retry-button"
                type="button"
                variant="secondary"
                size="compact"
                icon={<RefreshCw size={17} aria-hidden="true" />}
                onClick={() => void retryCamera()}
                loading={isStartingCamera}
              >
                Try Camera Again
              </Button>
            ) : null}

            <div className="camera-action-stack camera-setup-actions">
              <Button
                type="button"
                onClick={beginTrackedExercise}
                disabled={cameraStream === null || !previewReady}
              >
                Begin Exercise
              </Button>
              <Button type="button" variant="tertiary" onClick={continueWithoutTracking}>
                Continue Without Tracking
              </Button>
            </div>
          </div>
        </div>
      </Page>
    </>
  );
};

export const CameraSetupScreen = () => {
  const location = useLocation();
  const { cameraStream, mode, session, stopCamera } = useApp();
  const consentToken = consentTokenFromLocationState(location.state);
  const hasConsent = hasCameraSetupConsent(consentToken);
  const canEnterSetup =
    mode === 'demo' && session.status === 'idle' && hasConsent && cameraStream !== null;

  useEffect(() => {
    if (session.status !== 'idle' || canEnterSetup) return;
    clearCameraSetupConsent();
    stopCamera();
  }, [canEnterSetup, session.status, stopCamera]);

  if (session.status !== 'idle') {
    return <Navigate to={cameraExitPathBySessionStatus[session.status] ?? '/exercises'} replace />;
  }
  if (!canEnterSetup || consentToken === null) {
    return <Navigate to="/camera/permission" replace />;
  }
  return <CameraSetupExperience consentToken={consentToken} />;
};

const LoadingSkeletons = () => (
  <div className="camera-loading-skeletons" aria-hidden="true">
    <div className="camera-skeleton-row">
      <Skeleton className="camera-skeleton-square" />
      <span className="camera-skeleton-copy">
        <Skeleton className="camera-skeleton-line camera-skeleton-line-long" />
        <Skeleton className="camera-skeleton-line camera-skeleton-line-medium" />
      </span>
    </div>
    <div className="camera-skeleton-row camera-skeleton-feature">
      <Skeleton className="camera-skeleton-image" />
      <span className="camera-skeleton-copy">
        <Skeleton className="camera-skeleton-line camera-skeleton-line-short" />
        <span className="camera-skeleton-detail">
          <Skeleton />
          <Skeleton className="camera-skeleton-line camera-skeleton-line-long" />
        </span>
        <span className="camera-skeleton-detail">
          <Skeleton />
          <Skeleton className="camera-skeleton-line camera-skeleton-line-medium" />
        </span>
        <span className="camera-skeleton-detail">
          <Skeleton />
          <Skeleton className="camera-skeleton-line camera-skeleton-line-long" />
        </span>
      </span>
    </div>
    <div className="camera-skeleton-row camera-skeleton-summary">
      <Skeleton className="camera-skeleton-avatar" />
      <span className="camera-skeleton-copy">
        <Skeleton className="camera-skeleton-line camera-skeleton-line-medium" />
        <Skeleton className="camera-skeleton-line camera-skeleton-line-short" />
      </span>
      <Skeleton className="camera-skeleton-pill" />
    </div>
  </div>
);

export const WorkoutBuildingScreen = () => {
  const navigate = useNavigate();
  const { beginExercise, mode, session, stopCamera } = useApp();
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    const shouldFail = hasForcedLoadError();
    const milestones = [
      { delay: 120, value: 12 },
      { delay: 420, value: 26 },
      { delay: 760, value: 43 },
      { delay: 1120, value: 65 },
      { delay: 1580, value: 78 },
      { delay: 2050, value: 91 },
      { delay: 2480, value: 100 },
    ];
    const timers = milestones.map(({ delay, value }) =>
      window.setTimeout(() => setProgress(value), delay),
    );
    const completionTimer = window.setTimeout(() => {
      if (shouldFail) {
        stopCamera();
        navigate('/session/error', {
          replace: true,
          state: { workoutLoadFailed: true },
        });
        return;
      }
      beginExercise();
      navigate('/session/active', { replace: true });
    }, 2780);

    return () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer);
      });
      window.clearTimeout(completionTimer);
    };
  }, [beginExercise, navigate, stopCamera]);

  const stage =
    progress < 43
      ? 'Reviewing your movement preferences...'
      : progress < 78
        ? session.trackingEnabled
          ? 'Preparing simulated workout feedback...'
          : 'Personalizing your exercise plan...'
        : 'Getting your first exercise ready...';

  return (
    <>
      <AppHeader />
      <Page className="camera-flow camera-loading-page">
        <div className="camera-loading-content">
          <PageIntro
            title="Building your workout"
            subtitle={
              mode === 'live'
                ? 'Preparing a manual workout. Camera tracking is off in live mode.'
                : 'Matching exercises to your movement profile...'
            }
            centered
          />

          <div
            className="camera-loading-progress"
            role="progressbar"
            aria-label="Building workout"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={`${progress} percent. ${stage}`}
          >
            <div className="camera-loading-ring">
              <ProgressRing value={progress} size={194} />
              <span className="camera-loading-mark" aria-hidden="true">
                <BrandMark compact />
              </span>
            </div>
            <strong>{progress}%</strong>
            <span>{stage}</span>
          </div>

          <LoadingSkeletons />

          <aside className="camera-loading-note">
            <span aria-hidden="true">
              <Activity size={22} />
            </span>
            <p>Hang tight! We’re customizing your workout experience just for you.</p>
          </aside>
        </div>
      </Page>
    </>
  );
};

const ExerciseErrorVisual = () => (
  <div className="camera-error-visual" aria-hidden="true">
    <svg viewBox="0 0 420 280">
      <title>Exercise loading error illustration</title>
      <ellipse className="camera-error-shadow" cx="206" cy="229" rx="120" ry="18" />
      <path
        className="camera-error-path"
        d="M90 97c42-42 78-11 109 22 35 38 68 4 103 43 18 20 37 28 62 12"
      />
      <g className="camera-error-dumbbell" transform="translate(82 105) rotate(10 122 52)">
        <rect x="54" y="43" width="137" height="19" rx="9" />
        <rect x="30" y="18" width="31" height="70" rx="11" />
        <rect x="13" y="28" width="25" height="50" rx="10" />
        <rect x="184" y="18" width="31" height="70" rx="11" />
        <rect x="207" y="28" width="25" height="50" rx="10" />
      </g>
      <circle className="camera-error-bubble" cx="292" cy="71" r="43" />
      <path className="camera-error-alert" d="M292 49v27M292 91v1" />
      <path className="camera-error-rays" d="m326 31 11-14M337 50l18-7M329 70l17 6" />
      <path className="camera-error-cross" d="m66 139 14 14m0-14-14 14" />
      <circle className="camera-error-dot" cx="99" cy="58" r="7" />
      <circle className="camera-error-dot" cx="352" cy="143" r="7" />
    </svg>
  </div>
);

export const ExerciseLoadErrorScreen = () => {
  const navigate = useNavigate();
  const { buildWorkout, requestCamera, resetSession, session, stopCamera } = useApp();
  const [isRetrying, setIsRetrying] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const tryAgain = async () => {
    clearForcedLoadError();
    setIsRetrying(true);
    let cameraRestored = false;
    if (session.trackingEnabled) {
      cameraRestored = await requestCamera();
      if (!mountedRef.current) {
        if (cameraRestored) stopCamera();
        return;
      }
      if (!cameraRestored) buildWorkout(false);
    }
    navigate('/workout/building', { replace: true });
  };

  const returnHome = () => {
    stopCamera();
    resetSession();
    navigate('/dashboard');
  };

  return (
    <>
      <AppHeader />
      <Page className="camera-flow camera-error-page">
        <div className="camera-error-content">
          <ExerciseErrorVisual />
          <div className="camera-error-copy">
            <h1>We couldn’t load this exercise</h1>
            <p>Looks like something went wrong on our end. No worries. Your progress is safe.</p>
          </div>

          <div className="camera-error-actions">
            <Button
              type="button"
              icon={<RefreshCw size={21} aria-hidden="true" />}
              onClick={() => void tryAgain()}
              loading={isRetrying}
            >
              Try Again
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={<House size={21} aria-hidden="true" />}
              onClick={returnHome}
            >
              Return Home
            </Button>
          </div>

          <p className="camera-support-copy">
            Still having trouble?
            <a href="mailto:support@adaptfit.app?subject=Exercise%20loading%20help">
              Contact Support
            </a>
          </p>
        </div>
      </Page>
    </>
  );
};
