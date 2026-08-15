import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Gauge,
  Repeat2,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AppHeader,
  Button,
  EmptyState,
  formatDuration,
  Page,
  PageIntro,
  Surface,
  Tag,
} from '../components/ui';
import { ExerciseArt } from '../components/visuals';
import {
  difficultyOptions,
  movementPatternOptions,
  muscleGroupOptions,
} from '../data/profileOptions';
import { useApp } from '../state/AppContext';
import type { EquipmentId, WorkoutDifficulty, WorkoutPlan } from '../types';
import './workoutPlan.css';

const difficultyTone = (difficulty: WorkoutDifficulty) =>
  difficulty === 'beginner' ? 'success' : difficulty === 'advanced' ? 'warning' : 'accent';

/** Small preview tile reused by the plan list and the swap screen. */
const ExerciseThumb = ({ slug, name, image }: { slug: string; name: string; image?: string }) =>
  image !== undefined ? (
    <img className="plan-thumb" src={image} alt="" loading="lazy" />
  ) : (
    <span className="plan-thumb plan-thumb--art" aria-hidden="true">
      <ExerciseArt slug={slug} size={54} />
      <span className="sr-only">{name}</span>
    </span>
  );

export const BuildWorkoutScreen = () => {
  const navigate = useNavigate();
  const { movementProfile, generateWorkout } = useApp();
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<EquipmentId[]>(movementProfile.equipmentIds);
  const [difficulty, setDifficulty] = useState<WorkoutDifficulty>('intermediate');
  const [generating, setGenerating] = useState(false);

  const toggle = <T extends string>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const onGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const plan = await generateWorkout({
        muscleGroups,
        movementPatterns: patterns,
        equipment,
        difficulty,
      });
      if (plan !== null) navigate('/workout/plan');
    } finally {
      setGenerating(false);
    }
  }, [difficulty, equipment, generateWorkout, muscleGroups, navigate, patterns]);

  return (
    <>
      <AppHeader action="none" />
      <Page className="build-screen">
        <button type="button" className="setup-back" onClick={() => navigate('/dashboard')}>
          <ChevronLeft size={20} aria-hidden="true" />
          Home
        </button>
        <PageIntro
          eyebrow="Workout builder"
          title="Build Your Workout"
          subtitle="Choose what you want to train. Anything marked Pain / Avoid on your movement profile is left out automatically."
        />

        <Surface className="build-group">
          <h2>
            <Target size={19} aria-hidden="true" />
            Muscle Groups
          </h2>
          <div className="build-chips">
            {muscleGroupOptions.map((group) => (
              <button
                key={group}
                type="button"
                className={`build-chip ${muscleGroups.includes(group) ? 'is-active' : ''}`}
                aria-pressed={muscleGroups.includes(group)}
                onClick={() => setMuscleGroups((current) => toggle(current, group))}
              >
                {group}
              </button>
            ))}
          </div>
        </Surface>

        <Surface className="build-group">
          <h2>
            <Repeat2 size={19} aria-hidden="true" />
            Movement Patterns
          </h2>
          <div className="build-chips">
            {movementPatternOptions.map((pattern) => (
              <button
                key={pattern}
                type="button"
                className={`build-chip ${patterns.includes(pattern) ? 'is-active' : ''}`}
                aria-pressed={patterns.includes(pattern)}
                onClick={() => setPatterns((current) => toggle(current, pattern))}
              >
                {pattern}
              </button>
            ))}
          </div>
        </Surface>

        <Surface className="build-group">
          <h2>
            <Dumbbell size={19} aria-hidden="true" />
            Equipment
          </h2>
          <p className="build-group__note">Pre-filled from your profile. Adjust for today only.</p>
          <div className="build-chips">
            {movementProfile.equipmentIds.length === 0 ? (
              <p className="build-empty">
                No equipment saved yet. <Link to="/onboarding/equipment">Add some</Link> or build a
                bodyweight session.
              </p>
            ) : null}
            {movementProfile.equipmentIds.map((id) => (
              <button
                key={id}
                type="button"
                className={`build-chip ${equipment.includes(id) ? 'is-active' : ''}`}
                aria-pressed={equipment.includes(id)}
                onClick={() => setEquipment((current) => toggle(current, id))}
              >
                {id.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </Surface>

        <Surface className="build-group">
          <h2>
            <Gauge size={19} aria-hidden="true" />
            Difficulty
          </h2>
          <div className="build-difficulty">
            {difficultyOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`build-level ${difficulty === option.id ? 'is-active' : ''}`}
                aria-pressed={difficulty === option.id}
                onClick={() => setDifficulty(option.id)}
              >
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </Surface>

        <div className="setup-actions">
          <Button
            type="button"
            icon={<Sparkles size={19} aria-hidden="true" />}
            onClick={() => void onGenerate()}
            loading={generating}
          >
            Generate Workout
          </Button>
          <p className="setup-hint">
            Leave everything unselected for a balanced full-body session.
          </p>
        </div>
      </Page>
    </>
  );
};

const PlanDetail = ({ plan, heading }: { plan: WorkoutPlan; heading: string }) => {
  const navigate = useNavigate();
  const { exercises, selectExercise, startPlan } = useApp();

  const items = useMemo(
    () =>
      plan.items.map((item) => ({
        item,
        exercise: exercises.find((exercise) => exercise.slug === item.exerciseSlug),
      })),
    [exercises, plan.items],
  );

  return (
    <>
      <AppHeader action="none" />
      <Page className="plan-screen">
        <button type="button" className="setup-back" onClick={() => navigate('/dashboard')}>
          <ChevronLeft size={20} aria-hidden="true" />
          Home
        </button>
        <PageIntro eyebrow={heading} title={plan.title} subtitle={plan.summary} />

        <Surface className="plan-summary">
          <div className="plan-summary__stats">
            <span>
              <Dumbbell size={17} aria-hidden="true" />
              {plan.items.length} Exercises
            </span>
            <span>
              <Clock size={17} aria-hidden="true" />
              {plan.estimatedMinutes} min
            </span>
            <Tag tone={difficultyTone(plan.difficulty)}>
              {plan.difficulty[0].toLocaleUpperCase() + plan.difficulty.slice(1)}
            </Tag>
          </div>

          {plan.focusAreas.length > 0 ? (
            <div className="plan-focus">
              <p className="plan-focus__label">Focus Areas</p>
              <ul>
                {plan.focusAreas.map((area) => (
                  <li key={area}>
                    <span aria-hidden="true">
                      <Target size={16} />
                    </span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Surface>

        <section aria-labelledby="plan-items-heading" className="plan-items">
          <h2 id="plan-items-heading">Exercise List</h2>
          <ol>
            {items.map(({ item, exercise }, index) => (
              <li key={item.id}>
                <span className="plan-items__index" aria-hidden="true">
                  {index + 1}
                </span>
                <ExerciseThumb
                  slug={item.exerciseSlug}
                  name={exercise?.name ?? item.exerciseSlug}
                  image={exercise?.image}
                />
                <div className="plan-items__body">
                  <strong>{exercise?.name ?? item.exerciseSlug}</strong>
                  <small>
                    {item.sets} sets · {item.reps} reps · {item.restSeconds}s rest
                  </small>
                  {item.swapReason !== undefined ? (
                    <small className="plan-items__swap">
                      <ShieldCheck size={14} aria-hidden="true" />
                      Swapped: {item.swapReason}
                    </small>
                  ) : null}
                </div>
                <div className="plan-items__actions">
                  <Link className="plan-items__swap-link" to={`/workout/plan/${item.id}/swap`}>
                    <Repeat2 size={16} aria-hidden="true" />
                    Swap
                  </Link>
                  <Link
                    className="plan-items__detail-link"
                    to={`/exercises/${encodeURIComponent(item.exerciseSlug)}`}
                    aria-label={`View details for ${exercise?.name ?? item.exerciseSlug}`}
                  >
                    <ChevronRight size={20} aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="setup-actions">
          <Button
            type="button"
            icon={<ArrowRight size={19} aria-hidden="true" />}
            className="plan-start"
            onClick={() => {
              startPlan(plan);
              const first = plan.items[0];
              if (first !== undefined) selectExercise(first.exerciseSlug);
              navigate('/camera/permission');
            }}
          >
            Start Workout
          </Button>
        </div>
      </Page>
    </>
  );
};

export const RecommendedWorkoutScreen = () => {
  const navigate = useNavigate();
  const { recommendedWorkout } = useApp();

  if (recommendedWorkout === null) {
    return (
      <>
        <AppHeader action="none" />
        <Page className="plan-screen">
          <PageIntro
            eyebrow="Recommended"
            title="Nothing recommended yet"
            subtitle="Finish your profile and we'll suggest a session built around it."
          />
          <EmptyState
            title="No recommendation available"
            action={
              <Button type="button" onClick={() => navigate('/onboarding/goals')}>
                Finish your profile
              </Button>
            }
          >
            Recommendations use your goals, equipment, and movement profile.
          </EmptyState>
        </Page>
      </>
    );
  }

  return <PlanDetail plan={recommendedWorkout} heading="Recommended for you" />;
};

export const ActivePlanScreen = () => {
  const { activePlan, recommendedWorkout } = useApp();
  const plan = activePlan ?? recommendedWorkout;
  if (plan === null) return <Navigate to="/build" replace />;
  return (
    <PlanDetail plan={plan} heading={plan.recommended ? 'Recommended for you' : 'Your workout'} />
  );
};

export const SwapExerciseScreen = () => {
  const navigate = useNavigate();
  const { itemId = '' } = useParams();
  const { activePlan, exercises, alternativesFor, swapPlanItem } = useApp();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const item = activePlan?.items.find((candidate) => candidate.id === itemId) ?? null;
  const alternatives = useMemo(() => alternativesFor(itemId), [alternativesFor, itemId]);

  if (activePlan === null || item === null) return <Navigate to="/workout/plan" replace />;

  const current = exercises.find((exercise) => exercise.slug === item.exerciseSlug);
  const chosen = alternatives.find((alternative) => alternative.slug === selectedSlug) ?? null;

  return (
    <>
      <AppHeader action="none" />
      <Page className="swap-screen">
        <button type="button" className="setup-back" onClick={() => navigate('/workout/plan')}>
          <ChevronLeft size={20} aria-hidden="true" />
          Your workout
        </button>
        <PageIntro
          eyebrow="Swap exercise"
          title="Pick a replacement"
          subtitle="Alternatives work the same regions and respect your movement profile."
        />

        <Surface className="swap-card">
          <p className="swap-card__label">Replace</p>
          <div className="swap-card__row">
            <ExerciseThumb
              slug={item.exerciseSlug}
              name={current?.name ?? item.exerciseSlug}
              image={current?.image}
            />
            <div>
              <strong>{current?.name ?? item.exerciseSlug}</strong>
              <small>
                {item.sets} sets · {item.reps} reps
              </small>
            </div>
          </div>
        </Surface>

        <section aria-labelledby="swap-options-heading" className="swap-options">
          <h2 id="swap-options-heading">With</h2>
          {alternatives.length === 0 ? (
            <EmptyState title="No alternatives available">
              Every compatible movement for this slot is already in your plan.
            </EmptyState>
          ) : (
            <ul>
              {alternatives.map((alternative) => (
                <li key={alternative.slug}>
                  <button
                    type="button"
                    className={`swap-option ${selectedSlug === alternative.slug ? 'is-active' : ''}`}
                    aria-pressed={selectedSlug === alternative.slug}
                    onClick={() => setSelectedSlug(alternative.slug)}
                  >
                    <ExerciseThumb
                      slug={alternative.slug}
                      name={alternative.name}
                      image={alternative.image}
                    />
                    <span className="swap-option__body">
                      <strong>{alternative.name}</strong>
                      <small>{alternative.reason}</small>
                    </span>
                    {alternative.compatibility === 'caution' ? (
                      <Tag tone="warning">Check first</Tag>
                    ) : (
                      <Tag tone="success">Good fit</Tag>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {chosen !== null ? (
          <Surface className="swap-why">
            <span className="swap-why__icon" aria-hidden="true">
              <ShieldCheck size={22} />
            </span>
            <div>
              <strong>Why this swap?</strong>
              <p>{chosen.reason}</p>
            </div>
          </Surface>
        ) : null}

        <div className="swap-actions">
          <Button
            type="button"
            icon={<Repeat2 size={19} aria-hidden="true" />}
            disabled={chosen === null}
            onClick={() => {
              if (chosen === null) return;
              swapPlanItem(item.id, chosen.slug, chosen.reason);
              navigate('/workout/plan');
            }}
          >
            Swap Exercise
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/workout/plan')}>
            Cancel
          </Button>
        </div>
      </Page>
    </>
  );
};

export const WorkoutCompleteScreen = () => {
  const navigate = useNavigate();
  const { workoutCompletion, user } = useApp();

  if (workoutCompletion === null) return <Navigate to="/dashboard" replace />;

  const firstName = user.displayName.split(' ')[0];

  return (
    <>
      <AppHeader action="none" />
      <Page className="complete-screen">
        <div className="complete-hero">
          <span className="complete-hero__confetti" aria-hidden="true" />
          <span className="complete-hero__badge" aria-hidden="true">
            <Trophy size={40} />
          </span>
          <h1>Workout Complete!</h1>
          <p>Awesome work, {firstName}.</p>
        </div>

        <Surface className="complete-stats">
          <h2 className="sr-only">Workout totals</h2>
          <div>
            <span>
              <Clock size={16} aria-hidden="true" />
              Total Time
            </span>
            <strong>{formatDuration(workoutCompletion.totalSeconds)}</strong>
          </div>
          <div>
            <span>
              <Dumbbell size={16} aria-hidden="true" />
              Exercises
            </span>
            <strong>
              {workoutCompletion.exercisesCompleted}
              <small>/{workoutCompletion.totalExercises}</small>
            </strong>
          </div>
          <div>
            <span>
              <Flame size={16} aria-hidden="true" />
              Calories
            </span>
            <strong>{workoutCompletion.estimatedCalories}</strong>
          </div>
          <div>
            <span>
              <Scale size={16} aria-hidden="true" />
              Avg. Form
            </span>
            <strong>{workoutCompletion.averageFormScore}%</strong>
          </div>
        </Surface>

        <p className="complete-note">
          Calories are an estimate from session length and intensity, not a measurement.
        </p>

        <div className="setup-actions">
          <Button
            type="button"
            icon={<ArrowRight size={19} aria-hidden="true" />}
            className="complete-primary"
            onClick={() => navigate('/progress')}
          >
            View Summary
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
            Back to Home
          </Button>
        </div>
      </Page>
    </>
  );
};
