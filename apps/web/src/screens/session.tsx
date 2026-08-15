import {
  Activity,
  Check,
  ChevronsRight,
  CircleCheck,
  Clock3,
  Dumbbell,
  Gauge,
  HeartPulse,
  Layers3,
  Lightbulb,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, Button, formatDuration, Page, Surface } from '../components/ui';
import { CameraPreview, ExerciseArt } from '../components/visuals';
import { useApp } from '../state/AppContext';
import './session.css';

const getCameraVariant = (position: string): 'seated' | 'standing' =>
  position === 'seated' ? 'seated' : 'standing';

const getFormLabel = (score: number): string => {
  if (score >= 94) return 'Excellent';
  if (score >= 86) return 'Good';
  return 'Keep steady';
};

const getTempoLabel = (score: number, trackingEnabled: boolean): string => {
  if (!trackingEnabled) return 'Self paced';
  return score >= 86 ? 'Controlled' : 'Slow down';
};

const getCompletedReps = (set: number, targetReps: number, reps: number): number =>
  Math.max(0, (Math.max(1, set) - 1) * targetReps + reps);

const SessionHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <header className="session-heading">
    <h1>{title}</h1>
    <p>{subtitle}</p>
  </header>
);

const SessionMetric = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="session-metric">
    <span className="session-metric__icon" aria-hidden="true">
      {icon}
    </span>
    <span className="session-metric__copy">
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  </div>
);

const FinishEarlyDialog = ({
  open,
  completedReps,
  cancelLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  completedReps: number;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable =
        panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (focusable === undefined || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div className="finish-dialog__backdrop">
      <div
        ref={panelRef}
        className="finish-dialog__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="finish-dialog-title"
        aria-describedby="finish-dialog-description"
      >
        <span className="finish-dialog__icon" aria-hidden="true">
          <Pause size={26} />
        </span>
        <h2 id="finish-dialog-title">Finish this exercise early?</h2>
        <p id="finish-dialog-description">
          {completedReps === 0
            ? 'No reps have been logged. Finishing now will end the session without adding it to your progress.'
            : `${completedReps} ${completedReps === 1 ? 'rep is' : 'reps are'} logged. You can finish now or keep this session open.`}
        </p>
        <div className="finish-dialog__actions">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            Finish exercise
          </Button>
        </div>
      </div>
    </div>
  );
};

const useActiveSessionShortcuts = ({
  enabled,
  canLogRep,
  onLogRep,
  onPause,
}: {
  enabled: boolean;
  canLogRep: boolean;
  onLogRep: () => void;
  onPause: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'l' && canLogRep) {
        event.preventDefault();
        onLogRep();
      }
      if (key === 'p') {
        event.preventDefault();
        onPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canLogRep, enabled, onLogRep, onPause]);
};

const useStopCameraOnExternalExit = (stopCamera: () => void) => {
  useEffect(() => {
    const handleHeaderNavigation = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('.app-header a') !== null) {
        stopCamera();
      }
    };
    const handlePageExit = () => stopCamera();

    document.addEventListener('click', handleHeaderNavigation, true);
    window.addEventListener('pagehide', handlePageExit);
    return () => {
      document.removeEventListener('click', handleHeaderNavigation, true);
      window.removeEventListener('pagehide', handlePageExit);
    };
  }, [stopCamera]);
};

export const ActiveExerciseScreen = () => {
  const navigate = useNavigate();
  const {
    selectedExercise,
    session,
    mode,
    cameraStream,
    addRep,
    pauseExercise,
    endExercise,
    stopCamera,
  } = useApp();
  const isManual = !session.trackingEnabled;
  const canLogRep = isManual && session.reps < session.targetReps;
  const completedReps = getCompletedReps(session.set, session.targetReps, session.reps);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);

  useStopCameraOnExternalExit(stopCamera);

  const handlePause = useCallback(() => {
    pauseExercise();
    navigate('/session/paused');
  }, [navigate, pauseExercise]);

  const handleEnd = useCallback(() => {
    setFinishDialogOpen(false);
    stopCamera();
    endExercise();
    navigate('/session/complete');
  }, [endExercise, navigate, stopCamera]);

  const closeFinishDialog = useCallback(() => setFinishDialogOpen(false), []);

  useActiveSessionShortcuts({
    enabled: !finishDialogOpen,
    canLogRep,
    onLogRep: addRep,
    onPause: handlePause,
  });

  useEffect(() => {
    if (session.status === 'resting') {
      navigate('/session/rest');
    }
    if (session.status === 'complete') {
      stopCamera();
      navigate('/session/complete');
    }
  }, [navigate, session.status, stopCamera]);

  const formLabel = session.trackingEnabled ? getFormLabel(session.formScore) : 'Not tracked';
  const cameraLabel = !session.trackingEnabled
    ? cameraStream === null
      ? 'Manual counting. Exercise example.'
      : 'Live camera preview. Manual rep counting.'
    : mode === 'demo'
      ? 'Demo tracking preview'
      : cameraStream === null
        ? 'Tracking preview. Camera unavailable.'
        : 'Tracking preview';
  const tip =
    selectedExercise.tips[0] ?? 'Keep the movement smooth and stay within a comfortable range.';

  return (
    <>
      <AppHeader />
      <Page className="session-page session-page--active">
        <SessionHeading title={selectedExercise.name} subtitle="Exercise in progress" />

        <div className="session-camera-frame session-camera-frame--active">
          <CameraPreview
            stream={cameraStream}
            variant={getCameraVariant(selectedExercise.position)}
            className="session-camera"
          />
          <span className="session-camera-label">{cameraLabel}</span>
        </div>

        <Surface className="session-live-stats">
          <div>
            <span>Set</span>
            <strong>
              {session.set}{' '}
              <small className="session-live-stats__fraction">of {session.totalSets}</small>
            </strong>
          </div>
          <div className="session-live-stats__time">
            <strong>{formatDuration(session.elapsedSeconds)}</strong>
            <span>Elapsed time</span>
          </div>
          <div>
            <span>Reps</span>
            <strong>
              {session.reps}{' '}
              <small className="session-live-stats__fraction">/ {session.targetReps}</small>
            </strong>
          </div>
        </Surface>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Set {session.set} of {session.totalSets}. {session.reps} of {session.targetReps} reps
          logged.
        </p>

        <aside className="session-coach" aria-label="Form guidance">
          <span className="session-coach__icon" aria-hidden="true">
            <Lightbulb size={23} />
          </span>
          <div>
            <strong>{tip}</strong>
            <p>
              {session.trackingEnabled
                ? 'Use a comfortable range and keep each repetition deliberate.'
                : 'Count each controlled repetition as you complete it.'}
            </p>
            <span className="session-coach__indicator" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>
        </aside>

        <section
          className="session-metrics"
          aria-label={
            session.trackingEnabled ? 'Movement tracking metrics' : 'Manual workout status'
          }
        >
          <SessionMetric icon={<Check size={21} />} label="Form" value={formLabel} />
          <SessionMetric
            icon={<Activity size={21} />}
            label="Range of motion"
            value={session.trackingEnabled ? `${session.rangeOfMotion}%` : 'Not tracked'}
          />
          <SessionMetric
            icon={<HeartPulse size={21} />}
            label="Tempo"
            value={getTempoLabel(session.formScore, session.trackingEnabled)}
          />
        </section>

        {isManual ? (
          <div className="session-manual-controls">
            <Button
              type="button"
              variant="secondary"
              icon={<Plus size={21} aria-hidden="true" />}
              onClick={addRep}
              disabled={!canLogRep}
              aria-keyshortcuts="L"
            >
              {canLogRep ? 'Log rep' : 'Set complete'}
            </Button>
            <small className="session-manual-controls__hint">
              Camera tracking is off. Press L to log each rep.
            </small>
          </div>
        ) : null}

        <div className="session-actions">
          <Button
            type="button"
            onClick={() => setFinishDialogOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={finishDialogOpen}
          >
            Finish early
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={<Pause size={20} aria-hidden="true" />}
            onClick={handlePause}
            aria-keyshortcuts="P"
          >
            Pause
          </Button>
        </div>
      </Page>
      <FinishEarlyDialog
        open={finishDialogOpen}
        completedReps={completedReps}
        cancelLabel="Keep exercising"
        onCancel={closeFinishDialog}
        onConfirm={handleEnd}
      />
    </>
  );
};

export const PausedExerciseScreen = () => {
  const navigate = useNavigate();
  const {
    selectedExercise,
    session,
    mode,
    cameraStream,
    resumeExercise,
    restartSet,
    endExercise,
    stopCamera,
  } = useApp();
  const completedReps = getCompletedReps(session.set, session.targetReps, session.reps);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);

  useStopCameraOnExternalExit(stopCamera);

  const handleResume = () => {
    resumeExercise();
    navigate('/session/active');
  };

  const handleRestart = () => {
    restartSet();
    navigate('/session/active');
  };

  const handleEnd = useCallback(() => {
    setFinishDialogOpen(false);
    stopCamera();
    endExercise();
    navigate('/session/complete');
  }, [endExercise, navigate, stopCamera]);

  const closeFinishDialog = useCallback(() => setFinishDialogOpen(false), []);

  return (
    <>
      <AppHeader />
      <Page className="session-page session-page--paused">
        <SessionHeading
          title="Paused"
          subtitle="Take a break. You can resume when you are ready."
        />

        <Surface className="paused-summary">
          <div className="paused-summary__exercise">
            <ExerciseArt slug={selectedExercise.slug} size={68} />
            <div>
              <strong>{selectedExercise.name}</strong>
              <span>
                Set {session.set} of {session.totalSets}
              </span>
            </div>
          </div>
          <div className="paused-summary__metrics">
            <h2 className="sr-only">Paused exercise details</h2>
            <SessionMetric
              icon={<RotateCcw size={20} />}
              label="Reps"
              value={`${session.reps} / ${session.targetReps}`}
            />
            <SessionMetric
              icon={<Clock3 size={20} />}
              label="Elapsed time"
              value={formatDuration(session.elapsedSeconds)}
            />
            <SessionMetric
              icon={<Layers3 size={20} />}
              label="Set progress"
              value={`${session.set} / ${session.totalSets}`}
            />
          </div>
        </Surface>

        <div className="session-camera-frame session-camera-frame--paused">
          <CameraPreview
            stream={cameraStream}
            variant={getCameraVariant(selectedExercise.position)}
            paused
            className="session-camera"
          />
          <span className="session-camera-label">
            {cameraStream === null
              ? 'Paused exercise example'
              : mode === 'demo'
                ? 'Paused demo tracking preview'
                : 'Paused tracking preview'}
          </span>
        </div>

        <div className="session-actions session-actions--paused">
          <Button
            type="button"
            icon={<Play size={20} fill="currentColor" aria-hidden="true" />}
            onClick={handleResume}
          >
            Resume
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={<RotateCcw size={21} aria-hidden="true" />}
            onClick={handleRestart}
          >
            Restart set
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onClick={() => setFinishDialogOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={finishDialogOpen}
          >
            Finish early
          </Button>
        </div>
      </Page>
      <FinishEarlyDialog
        open={finishDialogOpen}
        completedReps={completedReps}
        cancelLabel="Stay paused"
        onCancel={closeFinishDialog}
        onConfirm={handleEnd}
      />
    </>
  );
};

export const RestScreen = () => {
  const navigate = useNavigate();
  const { selectedExercise, session, addRestTime, skipRest, continueAfterRest, stopCamera } =
    useApp();
  const [restExtensions, setRestExtensions] = useState(0);
  useStopCameraOnExternalExit(stopCamera);
  const progress = Math.min(
    100,
    Math.round((Math.max(1, session.set) / Math.max(1, session.totalSets)) * 100),
  );
  const timerProgress = Math.min(
    100,
    Math.round((session.restSeconds / Math.max(1, selectedExercise.restSeconds)) * 100),
  );
  const tip =
    selectedExercise.tips[1] ??
    selectedExercise.tips[0] ??
    'Keep your movement smooth and controlled through the full range.';

  const handleSkip = () => {
    skipRest();
    navigate('/session/active');
  };

  const handleContinue = () => {
    continueAfterRest();
    navigate('/session/active');
  };

  return (
    <>
      <AppHeader />
      <Page className="session-page session-page--rest">
        <SessionHeading
          title="Rest"
          subtitle="Great work! Take a short break and get ready for your next set."
        />

        <section className="rest-progress" aria-label="Workout progress">
          <div>
            <strong>Workout progress</strong>
            <span>{progress}%</span>
          </div>
          <progress
            value={progress}
            max="100"
            aria-label="Workout progress, sets completed"
            aria-valuetext={`Set ${session.set} of ${session.totalSets} completed`}
          >
            {progress}%
          </progress>
          <p>
            Set {session.set} of {session.totalSets} completed
          </p>
        </section>

        <div
          className="rest-timer"
          style={{ '--timer-progress': `${timerProgress * 3.6}deg` } as CSSProperties}
          role="timer"
          aria-label={`${session.restSeconds} seconds remaining`}
        >
          <div className="rest-timer__inner">
            <span>{session.restSeconds === 0 ? 'Ready' : 'Resting'}</span>
            <strong>{formatDuration(session.restSeconds)}</strong>
            <small className="rest-timer__label">
              {session.restSeconds === 0 ? 'Continue when ready' : 'Time remaining'}
            </small>
          </div>
        </div>
        {session.restSeconds === 0 ? (
          <p className="rest-ready" role="status">
            Your rest is complete. Continue whenever you feel ready.
          </p>
        ) : null}

        <div className="rest-details">
          <Surface className="rest-complete-card">
            <span className="rest-complete-card__icon" aria-hidden="true">
              <CircleCheck size={22} />
            </span>
            <div>
              <strong>Set {session.set} complete</strong>
              <span>Nice work. Stay consistent!</span>
            </div>
            <span className="rest-complete-card__badge" aria-hidden="true">
              <Dumbbell size={22} />
            </span>
          </Surface>

          <Surface className="rest-next-card">
            <ExerciseArt slug={selectedExercise.slug} size={82} />
            <div>
              <span>Up next</span>
              <strong>{selectedExercise.name}</strong>
              <small className="rest-next-card__reps">{session.targetReps} reps</small>
            </div>
          </Surface>

          <aside className="rest-tip">
            <span aria-hidden="true">
              <Lightbulb size={23} />
            </span>
            <div>
              <strong>Tip</strong>
              <p>{tip}</p>
            </div>
          </aside>
        </div>

        <div className="rest-actions">
          <Button
            type="button"
            variant="secondary"
            icon={<Plus size={21} aria-hidden="true" />}
            onClick={() => {
              addRestTime();
              setRestExtensions((current) => current + 1);
            }}
            aria-label="Add 15 seconds of rest"
          >
            15 sec
          </Button>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {restExtensions > 0
              ? `Added 15 seconds of rest. Additions this break: ${restExtensions}.`
              : ''}
          </p>
          <Button
            type="button"
            variant="secondary"
            icon={<ChevronsRight size={21} aria-hidden="true" />}
            onClick={handleSkip}
          >
            Skip rest
          </Button>
          <Button type="button" onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </Page>
    </>
  );
};

export const ExerciseCompletedScreen = () => {
  const navigate = useNavigate();
  const { selectedExercise, session, lastCompletedHistoryId, stopCamera } = useApp();
  const totalReps = getCompletedReps(session.set, session.targetReps, session.reps);
  const hasActivity = totalReps > 0;
  const totalSets = Math.max(
    0,
    Math.min(session.totalSets, session.set - 1 + (session.reps > 0 ? 1 : 0)),
  );
  const formLabel = getFormLabel(session.formScore).toLowerCase();
  const image = selectedExercise.image;

  useEffect(() => stopCamera(), [stopCamera]);

  return (
    <>
      <AppHeader />
      <Page className="session-page session-page--complete">
        <header className="completion-hero">
          <div className="completion-burst" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <CircleCheck size={48} strokeWidth={2.3} />
          </div>
          <h1>{hasActivity ? 'Exercise completed' : 'Session ended'}</h1>
          <p>
            {hasActivity
              ? 'Great work! Your completed activity is ready to review.'
              : 'No reps were logged, so this session was not added to your progress.'}
          </p>
        </header>

        <Surface className="completion-summary">
          <div className="completion-summary__visual">
            <h2>{selectedExercise.name}</h2>
            {image !== undefined ? (
              <img src={image} alt={`${selectedExercise.name} demonstration`} />
            ) : (
              <ExerciseArt slug={selectedExercise.slug} size={220} />
            )}
          </div>
          <dl className="completion-summary__metrics">
            <div>
              <dt>
                <span aria-hidden="true">
                  <Dumbbell size={21} />
                </span>
                Total reps
              </dt>
              <dd>{totalReps}</dd>
            </div>
            <div>
              <dt>
                <span aria-hidden="true">
                  <Layers3 size={21} />
                </span>
                Total sets
              </dt>
              <dd>{totalSets}</dd>
            </div>
            <div>
              <dt>
                <span aria-hidden="true">
                  <Clock3 size={21} />
                </span>
                Time
              </dt>
              <dd>{formatDuration(session.elapsedSeconds)}</dd>
            </div>
          </dl>
        </Surface>

        <aside className="completion-feedback">
          <span className="completion-feedback__icon" aria-hidden="true">
            <Sparkles size={23} />
          </span>
          <div>
            <h2>{hasActivity ? 'Nice work!' : 'Ready when you are'}</h2>
            {!hasActivity ? (
              <p>Choose another exercise or restart whenever it feels right.</p>
            ) : session.trackingEnabled ? (
              <>
                <p>
                  You completed {totalReps} reps with {formLabel} form and an average range of
                  motion of {session.rangeOfMotion}%.
                </p>
                <p>
                  Keep focusing on slow, deliberate movements and a range that feels comfortable.
                </p>
              </>
            ) : (
              <>
                <p>You logged {totalReps} controlled reps and kept the session moving.</p>
                <p>Keep choosing a steady pace and a comfortable range on your next set.</p>
              </>
            )}
            {hasActivity ? <p>Your consistency is building momentum. Keep it going!</p> : null}
          </div>
        </aside>

        <Button
          type="button"
          className="completion-continue"
          icon={<Gauge size={21} aria-hidden="true" />}
          onClick={() =>
            navigate(
              lastCompletedHistoryId === null ? '/history' : `/analysis/${lastCompletedHistoryId}`,
            )
          }
        >
          Continue
        </Button>
      </Page>
    </>
  );
};
