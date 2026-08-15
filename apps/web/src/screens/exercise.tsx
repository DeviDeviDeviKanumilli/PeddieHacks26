import {
  Accessibility,
  Activity,
  ArrowRight,
  Check,
  CircleAlert,
  CircleX,
  Clock3,
  Dumbbell,
  Info,
  Lightbulb,
  ListChecks,
  PersonStanding,
  Play,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookmarkButton, BrandMark, Button, StatusBar, Tag } from '../components/ui';
import { ExerciseArt, MuscleMap } from '../components/visuals';
import { useApp } from '../state/AppContext';
import type { Exercise } from '../types';
import './exercise.css';

type DetailTab = 'overview' | 'how-to' | 'muscles';

const detailTabs: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'how-to', label: 'How To' },
  { id: 'muscles', label: 'Muscles' },
];

const formatPosition = (position: Exercise['position']): string =>
  position
    .split('-')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

const compatibilityLabel: Record<Exercise['compatibility'], string> = {
  compatible: 'Fits your profile',
  caution: 'Review first',
  incompatible: 'Not compatible',
};

const regionKey = (region: string): string => {
  const normalized = region.toLowerCase();
  if (normalized.includes('knee')) return 'knee';
  if (normalized.includes('back')) return 'back';
  if (normalized.includes('shoulder')) return 'shoulder';
  if (normalized.includes('arm')) return 'arm';
  if (normalized.includes('hip')) return 'hip';
  if (normalized.includes('core')) return 'core';
  return normalized;
};

const matchingAvoidRegions = (exercise: Exercise, avoidRegions: string[]): string[] => {
  const exerciseRegionKeys = new Set(exercise.bodyRegions.map(regionKey));
  return avoidRegions.filter((region) => exerciseRegionKeys.has(regionKey(region)));
};

const ExerciseFlowHeader = ({ exercise }: { exercise: Exercise }) => {
  const { favorites, toggleFavorite } = useApp();
  const isSaved = favorites.has(exercise.slug);

  return (
    <>
      <StatusBar />
      <header className="exercise-flow-header">
        <Link to="/dashboard" aria-label="Go to dashboard">
          <BrandMark />
        </Link>
        <BookmarkButton
          active={isSaved}
          label={`Save ${exercise.name}`}
          onClick={() => toggleFavorite(exercise.slug)}
        />
      </header>
    </>
  );
};

const ExerciseNotFoundScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="exercise-screen exercise-screen_not-found">
      <StatusBar />
      <header className="exercise-flow-header">
        <Link to="/dashboard" aria-label="Go to dashboard">
          <BrandMark />
        </Link>
      </header>
      <main className="exercise-not-found" tabIndex={-1}>
        <span className="exercise-not-found_icon" aria-hidden="true">
          <CircleAlert size={30} />
        </span>
        <p className="exercise-detail_eyebrow">Movement library</p>
        <h1>Exercise not found</h1>
        <p>We could not find an exercise at this address. It may have been renamed or removed.</p>
        <div className="exercise-not-found_actions">
          <Button
            type="button"
            icon={<Dumbbell size={20} />}
            onClick={() => navigate('/exercises')}
          >
            Browse exercises
          </Button>
          <Button type="button" variant="tertiary" onClick={() => navigate('/dashboard')}>
            Return to dashboard
          </Button>
        </div>
      </main>
    </div>
  );
};

const ExerciseMedia = ({
  exercise,
  compact = false,
}: {
  exercise: Exercise;
  compact?: boolean;
}) => (
  <div className={`exercise-media ${compact ? 'exercise-media_compact' : ''}`}>
    {exercise.image !== undefined ? (
      <img src={exercise.image} alt={`${exercise.name} demonstration`} />
    ) : (
      <ExerciseArt slug={exercise.slug} size={compact ? 176 : 244} />
    )}
  </div>
);

const ProcedurePanel = ({
  exercise,
  bare = false,
}: {
  exercise: Exercise;
  /** Rendered inside a parent tabpanel, so it must not declare tab roles itself. */
  bare?: boolean;
}) => (
  <section className="exercise-detail_panel" role={bare ? undefined : 'tabpanel'}>
    <header className="exercise-detail_section-heading">
      <span className="exercise-detail_section-icon" aria-hidden="true">
        <ListChecks size={22} />
      </span>
      <div>
        <p className="exercise-detail_kicker">Step by step</p>
        <h2>Procedure</h2>
      </div>
    </header>

    <ol className="exercise-detail_steps">
      {exercise.instructions.map((instruction, index) => (
        <li key={`${exercise.slug}-${instruction}`}>
          <span className="exercise-detail_step-number" aria-hidden="true">
            {index + 1}
          </span>
          <span>{instruction}</span>
        </li>
      ))}
    </ol>

    <fieldset className="exercise-detail_prescription">
      <legend className="sr-only">Suggested exercise plan</legend>
      <span>
        <Dumbbell size={18} aria-hidden="true" />
        <strong>{exercise.defaultSets}</strong> sets
      </span>
      <span>
        <Activity size={18} aria-hidden="true" />
        <strong>{exercise.defaultReps}</strong> reps
      </span>
      <span>
        <Clock3 size={18} aria-hidden="true" />
        <strong>{exercise.restSeconds}</strong> sec rest
      </span>
    </fieldset>
  </section>
);

const TipsPanel = ({
  exercise,
  bare = false,
}: {
  exercise: Exercise;
  /** Rendered inside a parent tabpanel, so it must not declare tab roles itself. */
  bare?: boolean;
}) => (
  <section className="exercise-detail_panel" role={bare ? undefined : 'tabpanel'}>
    <header className="exercise-detail_section-heading">
      <span className="exercise-detail_section-icon" aria-hidden="true">
        <Lightbulb size={22} />
      </span>
      <div>
        <p className="exercise-detail_kicker">Move with control</p>
        <h2>Tips</h2>
      </div>
    </header>

    <ul className="exercise-detail_tips">
      {exercise.tips.map((tip) => (
        <li key={`${exercise.slug}-${tip}`}>
          <span aria-hidden="true">
            <Check size={18} />
          </span>
          <p>{tip}</p>
        </li>
      ))}
    </ul>

    <aside className="exercise-detail_support-note">
      <Accessibility size={21} aria-hidden="true" />
      <div>
        <strong>Make the movement yours</strong>
        <p>Use a comfortable range, keep your setup stable, and stop if you feel discomfort.</p>
      </div>
    </aside>
  </section>
);

const VideoPanel = ({
  exercise,
  bare = false,
}: {
  exercise: Exercise;
  /** Rendered inside a parent tabpanel, so it must not declare tab roles itself. */
  bare?: boolean;
}) => (
  <section className="exercise-detail_panel" role={bare ? undefined : 'tabpanel'}>
    <header className="exercise-detail_section-heading">
      <span className="exercise-detail_section-icon" aria-hidden="true">
        <Play size={21} fill="currentColor" />
      </span>
      <div>
        <p className="exercise-detail_kicker">Instructional media</p>
        <h2>How to do it</h2>
      </div>
    </header>

    <figure className="exercise-detail_video">
      <ExerciseMedia exercise={exercise} />
      <span className="exercise-detail_video-label">
        <Sparkles size={18} aria-hidden="true" />
        Instructional still
      </span>
      <figcaption>
        <strong>Visual setup preview</strong>
        <span>
          A video clip is not included in this demo. Use the How To tab for the complete movement
          sequence.
        </span>
      </figcaption>
    </figure>
  </section>
);

export const ExerciseDetailScreen = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { exercises, movementProfile, selectExercise } = useApp();
  const exercise = exercises.find((candidate) => candidate.slug === slug);
  const exerciseSlug = exercise?.slug;
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const tabsId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const avoidedProfileRegions = useMemo(
    () =>
      exercise === undefined ? [] : matchingAvoidRegions(exercise, movementProfile.avoidRegions),
    [exercise, movementProfile.avoidRegions],
  );

  useEffect(() => {
    if (exerciseSlug === undefined) return;
    selectExercise(exerciseSlug);
    setActiveTab('overview');
  }, [exerciseSlug, selectExercise]);

  if (exercise === undefined) return <ExerciseNotFoundScreen />;

  const activeTabIndex = detailTabs.findIndex((tab) => tab.id === activeTab);
  const needsCompatibilityReview =
    exercise.compatibility !== 'compatible' || avoidedProfileRegions.length > 0;

  const moveTabFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % detailTabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + detailTabs.length) % detailTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = detailTabs.length - 1;
    const nextTab = detailTabs[nextIndex];
    if (nextTab === undefined) return;
    setActiveTab(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  };

  const continueToNextStep = () => {
    selectExercise(exercise.slug);
    if (needsCompatibilityReview) {
      navigate(`/exercises/${exercise.slug}/compatibility`);
    } else {
      navigate('/camera/permission');
    }
  };

  return (
    <div className="exercise-screen exercise-screen_detail">
      <ExerciseFlowHeader exercise={exercise} />
      <main className="exercise-detail" tabIndex={-1}>
        <header className="exercise-detail_intro">
          <p className="exercise-detail_eyebrow">Movement library</p>
          <h1>
            <span className="sr-only">{exercise.name}: </span>
            Exercise Detail
          </h1>
          <p>Review the movement, set up at your pace, then choose how you want to continue.</p>
        </header>

        <div className="exercise-detail_tabs" role="tablist" aria-label="Exercise instructions">
          {detailTabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                id={`${tabsId}-${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tabsId}-${tab.id}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => moveTabFocus(event, index)}
              >
                {tab.label}
              </button>
            );
          })}
          <span
            className="exercise-detail_tab-indicator"
            style={{ transform: `translateX(${Math.max(0, activeTabIndex) * 100}%)` }}
            aria-hidden="true"
          />
        </div>

        <article
          className="exercise-detail_overview"
          id={`${tabsId}-overview-panel`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-overview-tab`}
          hidden={activeTab !== 'overview'}
        >
          <header>
            <div>
              <div className="exercise-detail_status-row">
                <Tag tone={needsCompatibilityReview ? 'warning' : 'success'}>
                  {avoidedProfileRegions.length > 0
                    ? 'Review profile match'
                    : compatibilityLabel[exercise.compatibility]}
                </Tag>
                {exercise.trackingSupported ? <Tag tone="accent">Camera optional</Tag> : null}
              </div>
              <h2>{exercise.name}</h2>
              <p>{exercise.summary}</p>
            </div>
            <fieldset className="exercise-detail_quick-facts">
              <legend className="sr-only">Exercise details</legend>
              <span>{formatPosition(exercise.position)}</span>
              <span>Level {exercise.difficulty}</span>
            </fieldset>
          </header>

          <div className="exercise-detail_overview-grid">
            <figure>
              <ExerciseMedia exercise={exercise} />
              <figcaption>
                <Sparkles size={17} aria-hidden="true" />
                Move through a comfortable range
              </figcaption>
            </figure>
            <VideoPanel exercise={exercise} bare />
          </div>
        </article>

        {/* "How To" carries the step-by-step and the coaching cues together. */}
        <div
          id={`${tabsId}-how-to-panel`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-how-to-tab`}
          hidden={activeTab !== 'how-to'}
          className="exercise-detail_how-to"
        >
          <ProcedurePanel exercise={exercise} bare />
          <TipsPanel exercise={exercise} bare />
        </div>

        <section
          id={`${tabsId}-muscles-panel`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-muscles-tab`}
          hidden={activeTab !== 'muscles'}
          className="exercise-detail_muscles-panel"
        >
          <h2>Muscles Worked</h2>
          <MuscleMap />
          <div className="exercise-detail_muscle-list">
            {exercise.muscles.map((muscle) => (
              <span key={muscle}>{muscle}</span>
            ))}
          </div>
          <p className="exercise-detail_regions">Body regions: {exercise.bodyRegions.join(', ')}</p>
        </section>

        <footer className="exercise-detail_continue">
          <p>
            {needsCompatibilityReview
              ? 'Continue to review this movement against your saved profile.'
              : 'Next, choose whether to use camera-guided tracking.'}
          </p>
          <Button type="button" icon={<ArrowRight size={20} />} onClick={continueToNextStep}>
            Continue
          </Button>
        </footer>
      </main>
    </div>
  );
};

const reasonIcon = (reason: string) => {
  const normalized = reason.toLowerCase();
  if (normalized.includes('knee') || normalized.includes('bend')) return <Activity size={25} />;
  if (normalized.includes('stand')) return <PersonStanding size={25} />;
  if (normalized.includes('back') || normalized.includes('strain'))
    return <ShieldAlert size={25} />;
  return <CircleAlert size={25} />;
};

export const CompatibilityWarningScreen = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { exercises, movementProfile, selectExercise } = useApp();
  const exercise = exercises.find((candidate) => candidate.slug === slug);
  const exerciseSlug = exercise?.slug;

  useEffect(() => {
    if (exerciseSlug !== undefined) selectExercise(exerciseSlug);
  }, [exerciseSlug, selectExercise]);

  const relevantAvoidRegions = useMemo(() => {
    if (exercise === undefined) return [];
    return matchingAvoidRegions(exercise, movementProfile.avoidRegions);
  }, [exercise, movementProfile.avoidRegions]);

  if (exercise === undefined) return <ExerciseNotFoundScreen />;

  const hardIncompatible = exercise.compatibility === 'incompatible';
  const adaptation = exercises.find((candidate) => candidate.slug === exercise.adaptationSlug);
  const reasons =
    exercise.cautionReasons !== undefined && exercise.cautionReasons.length > 0
      ? exercise.cautionReasons
      : [
          hardIncompatible
            ? 'This movement conflicts with a required profile setting'
            : 'This movement needs an extra comfort and support check',
        ];
  const profileRegions =
    relevantAvoidRegions.length > 0 ? relevantAvoidRegions : movementProfile.avoidRegions;

  const viewAdaptation = () => {
    if (adaptation === undefined) return;
    selectExercise(adaptation.slug);
    navigate(`/exercises/${adaptation.slug}`);
  };

  const continueAnyway = () => {
    if (hardIncompatible) return;
    selectExercise(exercise.slug);
    navigate('/camera/permission');
  };

  return (
    <div className="exercise-screen exercise-screen_warning">
      <ExerciseFlowHeader exercise={exercise} />
      <main className="compatibility-warning" tabIndex={-1}>
        <header className="compatibility-warning_intro">
          <span aria-hidden="true">
            {hardIncompatible ? <CircleX size={25} /> : <CircleAlert size={25} />}
          </span>
          <div>
            <p className="compatibility-warning_eyebrow">Profile check</p>
            <h1>
              <span className="sr-only">{exercise.name}: </span>
              Compatibility Warning
            </h1>
            <p>
              {hardIncompatible
                ? 'This exercise conflicts with your saved movement profile and cannot be started.'
                : 'This exercise may not fully align with your saved constraints and could cause discomfort.'}
            </p>
          </div>
        </header>

        <section
          className="compatibility-warning_card"
          aria-labelledby="compatibility-exercise-name"
        >
          <div className="compatibility-warning_exercise">
            <Tag tone={hardIncompatible ? 'warning' : 'neutral'}>
              {hardIncompatible ? 'Not compatible' : 'Needs review'}
            </Tag>
            <h2 id="compatibility-exercise-name">{exercise.name}</h2>
            <p>{exercise.summary}</p>
            <ExerciseMedia exercise={exercise} compact />
          </div>

          <div className="compatibility-warning_reasons">
            <h2>Why this may not be ideal</h2>
            <ul>
              {reasons.map((reason) => (
                <li key={reason}>
                  <span aria-hidden="true">{reasonIcon(reason)}</span>
                  <p>{reason}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside
          className={`compatibility-warning_profile ${hardIncompatible ? 'is-hard' : ''}`}
          aria-labelledby="profile-match-title"
        >
          <span className="compatibility-warning_profile-icon" aria-hidden="true">
            <Info size={25} />
          </span>
          <div>
            <h2 id="profile-match-title">Your saved profile</h2>
            {profileRegions.length > 0 ? (
              <>
                <p>
                  You marked the following movement areas as avoid. Each label shows whether that
                  area overlaps with this exercise.
                </p>
                <ul aria-label="Avoided body regions">
                  {profileRegions.map((region) => (
                    <li
                      key={region}
                      className={relevantAvoidRegions.includes(region) ? 'is-relevant' : ''}
                    >
                      <span className="compatibility-warning_region-dot" aria-hidden="true" />
                      <span className="compatibility-warning_region-copy">
                        <strong>{region}</strong>
                        <small>
                          {relevantAvoidRegions.includes(region)
                            ? 'Overlaps this exercise'
                            : 'Does not overlap this exercise'}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                No avoided body regions are saved. Review the movement requirements before
                continuing.
              </p>
            )}
          </div>
        </aside>

        <div className="compatibility-warning_actions">
          <Button
            type="button"
            icon={<Sparkles size={20} />}
            disabled={adaptation === undefined}
            onClick={viewAdaptation}
          >
            {adaptation === undefined ? 'No adapted version available' : 'View adapted version'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={<Dumbbell size={20} />}
            onClick={() => navigate('/exercises')}
          >
            Find similar exercises
          </Button>
          <Button
            type="button"
            variant="tertiary"
            disabled={hardIncompatible}
            icon={hardIncompatible ? <ShieldAlert size={19} /> : <ArrowRight size={19} />}
            onClick={continueAnyway}
          >
            {hardIncompatible ? 'Cannot continue with this exercise' : 'Continue anyway'}
          </Button>
        </div>

        <p className="compatibility-warning_scope">
          AdaptFit offers general wellness guidance. Choose the option that feels right for you.
        </p>
      </main>
    </div>
  );
};
