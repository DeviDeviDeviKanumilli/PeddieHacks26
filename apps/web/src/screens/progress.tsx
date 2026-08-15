import {
  Activity,
  CalendarDays,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Info,
  Layers3,
  Lightbulb,
  ShieldCheck,
  Star,
  Target,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AppHeader,
  BottomNav,
  Button,
  Chip,
  EmptyState,
  formatDuration,
  formatShortDate,
  MetricTile,
  Page,
  PageIntro,
  SearchField,
  Surface,
  Tag,
} from '../components/ui';
import {
  ActivityGrid,
  ExerciseArt,
  MuscleMap,
  ProgressRing,
  RepBarChart,
} from '../components/visuals';
import { useApp } from '../state/AppContext';
import type { WorkoutHistoryItem } from '../types';
import './progress.css';

type ActivityRange = '3M' | '6M' | '1Y';
type HistoryFilter = 'all' | WorkoutHistoryItem['category'] | 'favorites';

const activityCellCounts: Record<ActivityRange, number> = {
  '3M': 91,
  '6M': 182,
  '1Y': 364,
};

const numberFormatter = new Intl.NumberFormat();

const formatNumber = (value: number) => numberFormatter.format(value);

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

const HistoryCategoryIcon = ({ category }: { category: WorkoutHistoryItem['category'] }) => {
  if (category === 'mobility') return <Activity size={24} aria-hidden="true" />;
  if (category === 'core') return <Target size={24} aria-hidden="true" />;
  if (category === 'cardio') return <Flame size={24} aria-hidden="true" />;
  if (category === 'balance') return <ShieldCheck size={24} aria-hidden="true" />;
  return <Dumbbell size={24} aria-hidden="true" />;
};

const WeeklyStat = ({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) => (
  <div className="weekly-stat">
    <span className="weekly-stat__icon">{icon}</span>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </div>
);

export const DashboardScreen = () => {
  const { history, progress } = useApp();
  const [activityRange, setActivityRange] = useState<ActivityRange>('3M');
  const coverageMessage =
    progress.bodyCoverage >= 80
      ? 'You are reaching more areas consistently.'
      : 'Keep exploring comfortable movement across more areas.';

  return (
    <>
      <AppHeader action="none" />
      <Page wide className="progress-page dashboard-screen">
        <PageIntro title="Dashboard" subtitle="Your progress at a glance." />

        <section className="dashboard-metrics" aria-label="All-time workout totals">
          <MetricTile
            icon={<Clock size={22} aria-hidden="true" />}
            label="Total Time"
            value={formatDuration(progress.totalSeconds)}
            note="All time"
          />
          <MetricTile
            icon={<Dumbbell size={22} aria-hidden="true" />}
            label="Exercises Done"
            value={formatNumber(progress.exercisesCompleted)}
            note="All time"
          />
          <MetricTile
            icon={<Target size={22} aria-hidden="true" />}
            label="Total Reps"
            value={formatNumber(progress.totalReps)}
            note="All time"
          />
          <MetricTile
            icon={<Layers3 size={22} aria-hidden="true" />}
            label="Total Sets"
            value={formatNumber(progress.totalSets)}
            note="All time"
          />
        </section>

        <section className="dashboard-analytics" aria-label="Body coverage analytics">
          <Surface className="coverage-panel">
            <div className="panel-heading">
              <div>
                <h2>Body Coverage</h2>
                <p>Body areas covered across your completed workout summary</p>
              </div>
              <Info size={17} aria-label="Coverage is based on completed exercises" />
            </div>
            <div className="coverage-panel__content">
              <div role="img" aria-label={`${progress.bodyCoverage}% body coverage`}>
                <ProgressRing value={progress.bodyCoverage} label="Covered" size={176} />
              </div>
              <div className="coverage-panel__copy">
                <Tag tone="accent">
                  {progress.bodyCoverage >= 80 ? 'Great job!' : 'Building coverage'}
                </Tag>
                <p>{coverageMessage}</p>
              </div>
            </div>
          </Surface>

          <Surface className="muscle-panel">
            <div className="panel-heading">
              <div>
                <h2>Muscle Map Reference</h2>
                <p>A general guide to the muscle groups used by AdaptFit exercises</p>
              </div>
              <Info
                size={17}
                aria-label="This is a reference illustration, not a personalized measurement"
              />
            </div>
            <MuscleMap />
            <ul className="intensity-legend" aria-label="Muscle intensity legend">
              <li>
                <i className="legend-dot legend-dot--high" />
                High
              </li>
              <li>
                <i className="legend-dot legend-dot--medium" />
                Medium
              </li>
              <li>
                <i className="legend-dot legend-dot--low" />
                Low
              </li>
              <li>
                <i className="legend-dot legend-dot--none" />
                Not hit
              </li>
            </ul>
            <p className="visual-note">Reference illustration, not personalized intensity data</p>
          </Surface>
        </section>

        <Surface className="workout-activity">
          <div className="panel-heading panel-heading--activity">
            <div>
              <h2>Workout Activity</h2>
              <p>A representative daily pattern for the selected period</p>
            </div>
            <fieldset className="range-selector">
              <legend className="sr-only">Workout activity period</legend>
              {(Object.keys(activityCellCounts) as ActivityRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  className={activityRange === range ? 'is-active' : ''}
                  aria-pressed={activityRange === range}
                  onClick={() => setActivityRange(range)}
                >
                  {range}
                </button>
              ))}
            </fieldset>
            <span className="sr-only" aria-live="polite">
              Showing the {activityRange} activity pattern
            </span>
          </div>
          <div className={`activity-scroll activity-scroll--${activityRange.toLowerCase()}`}>
            <ActivityGrid count={activityCellCounts[activityRange]} />
          </div>
          <ul className="activity-legend" aria-label="Activity intensity legend">
            <li>
              <i className="legend-square legend-square--low" />
              Less activity
            </li>
            <li>
              <i className="legend-square legend-square--high" />
              More activity
            </li>
            <li>
              <i className="legend-square legend-square--none" />
              No activity
            </li>
          </ul>
          <p className="visual-note">
            Pattern preview for {history.length} saved{' '}
            {history.length === 1 ? 'workout' : 'workouts'}
          </p>
        </Surface>

        <Surface className="weekly-summary">
          <div className="weekly-summary__heading">
            <div className="panel-heading">
              <h2>This Week</h2>
              <Info size={17} aria-label="Summary of this week's completed activity" />
            </div>
            <Link to="/history">
              View details <ChevronRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="weekly-summary__grid">
            <WeeklyStat
              icon={<Flame size={20} aria-hidden="true" />}
              label="Workouts"
              value={formatNumber(progress.weeklyWorkouts)}
              note="Completed"
            />
            <WeeklyStat
              icon={<Clock size={20} aria-hidden="true" />}
              label="Time"
              value={formatDuration(progress.weeklySeconds)}
              note="Total"
            />
            <WeeklyStat
              icon={<Activity size={20} aria-hidden="true" />}
              label="Reps"
              value={formatNumber(progress.weeklyReps)}
              note="Total"
            />
            <WeeklyStat
              icon={<Layers3 size={20} aria-hidden="true" />}
              label="Sets"
              value={formatNumber(progress.weeklySets)}
              note="Total"
            />
          </div>
        </Surface>

        <aside className="progress-tip">
          <span className="progress-tip__icon">
            <Lightbulb size={24} aria-hidden="true" />
          </span>
          <div>
            <strong>Tip of the Day</strong>
            <p>
              {progress.weeklyWorkouts >= 5
                ? 'Great consistency. Give recovery the same attention as your workouts.'
                : 'A short, comfortable session still counts toward a consistent week.'}
            </p>
          </div>
        </aside>
      </Page>
      <BottomNav />
    </>
  );
};

export const HistoryScreen = () => {
  const { history, progress } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const filteredHistory = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return history.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'favorites' ? item.favorite === true : item.category === filter);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.title.toLocaleLowerCase().includes(normalizedQuery) ||
        item.category.toLocaleLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [filter, history, query]);

  const resetFilters = () => {
    setQuery('');
    setFilter('all');
  };

  const filters: Array<{ value: HistoryFilter; label: string; icon?: ReactNode }> = [
    { value: 'all', label: 'All Workouts' },
    { value: 'strength', label: 'Strength', icon: <Dumbbell size={18} aria-hidden="true" /> },
    { value: 'mobility', label: 'Mobility', icon: <Activity size={18} aria-hidden="true" /> },
    { value: 'core', label: 'Core', icon: <Target size={18} aria-hidden="true" /> },
    { value: 'cardio', label: 'Cardio', icon: <Flame size={18} aria-hidden="true" /> },
    { value: 'balance', label: 'Balance', icon: <ShieldCheck size={18} aria-hidden="true" /> },
    { value: 'favorites', label: 'Favorites', icon: <Star size={18} aria-hidden="true" /> },
  ];

  return (
    <>
      <AppHeader />
      <Page wide className="progress-page history-screen">
        <PageIntro
          title="Exercise History"
          subtitle="Track your progress and keep building momentum."
        />

        <Surface className="history-overview">
          <h2 className="sr-only">Weekly exercise summary</h2>
          <div className="history-overview__stat">
            <span>This Week</span>
            <strong>{formatNumber(progress.weeklyWorkouts)}</strong>
            <small>Workouts</small>
          </div>
          <span className="history-overview__icon">
            <CalendarDays size={25} aria-hidden="true" />
          </span>
          <div className="history-overview__stat">
            <span>Total Reps</span>
            <strong>{formatNumber(progress.weeklyReps)}</strong>
            <small>reps</small>
          </div>
          <div className="history-overview__stat">
            <span>Avg. Form Score</span>
            <strong>{progress.averageFormScore}%</strong>
            <Tag tone="accent">{progress.averageFormScore >= 90 ? 'Excellent' : 'Good'}</Tag>
          </div>
        </Surface>

        <div className="history-tools">
          <SearchField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workouts"
            aria-label="Search workout history"
          />
        </div>

        <fieldset className="history-filters">
          <legend className="sr-only">Filter workout history</legend>
          {filters.map((item) => (
            <Chip
              key={item.value}
              active={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.icon}
              {item.label}
            </Chip>
          ))}
        </fieldset>

        <section className="recent-workouts" aria-labelledby="recent-workouts-heading">
          <div className="recent-workouts__heading">
            <h2 id="recent-workouts-heading">Recent Workouts</h2>
            <span aria-live="polite">
              {filteredHistory.length} {filteredHistory.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {filteredHistory.length > 0 ? (
            <div className="history-list">
              {filteredHistory.map((item) => (
                <Link
                  key={item.id}
                  className="history-row"
                  to={`/analysis/${encodeURIComponent(item.id)}`}
                >
                  <span className="history-row__icon">
                    <HistoryCategoryIcon category={item.category} />
                  </span>
                  <div className="history-row__identity">
                    <div className="history-row__title">
                      <strong>{item.title}</strong>
                      {item.favorite === true ? (
                        <Star size={15} fill="currentColor" aria-label="Favorite workout" />
                      ) : null}
                    </div>
                    <time dateTime={item.completedAt}>
                      {formatShortDate(item.completedAt)}
                      <span>
                        {new Intl.DateTimeFormat(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        }).format(new Date(item.completedAt))}
                      </span>
                    </time>
                  </div>
                  <div className="history-row__metric">
                    {item.targetReps > 0 ? (
                      <>
                        <span>
                          <Dumbbell size={18} aria-hidden="true" />
                        </span>
                        <strong>
                          {item.completedReps}/{item.targetReps}
                        </strong>
                        <small>Total Reps</small>
                      </>
                    ) : (
                      <Tag tone="accent">Mobility</Tag>
                    )}
                  </div>
                  <div className="history-row__metric">
                    <span>
                      <Clock size={18} aria-hidden="true" />
                    </span>
                    <strong>{formatDuration(item.durationSeconds)}</strong>
                    <small>Duration</small>
                  </div>
                  <ChevronRight className="history-row__chevron" size={22} aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              title="Complete your first workout"
              action={
                <Link className="button button--primary" to="/exercises">
                  Browse exercises
                </Link>
              }
            >
              <p>Your completed sessions and summaries will appear here.</p>
            </EmptyState>
          ) : (
            <EmptyState
              title="No workouts match"
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            >
              <p>Try another search or show all workouts to find a completed session.</p>
            </EmptyState>
          )}
        </section>
      </Page>
      <BottomNav />
    </>
  );
};

export const DetailedAnalysisScreen = () => {
  const { id } = useParams<{ id: string }>();
  const { exercises, history, progress, selectedExercise, session } = useApp();
  const isCurrentAnalysis = id === 'demo' || id === 'current';
  const historyItem = isCurrentAnalysis ? undefined : history.find((item) => item.id === id);

  if (!isCurrentAnalysis && historyItem === undefined) {
    return (
      <>
        <AppHeader />
        <Page wide className="progress-page analysis-screen">
          <EmptyState
            title="Analysis not found"
            headingLevel="h1"
            action={
              <Link className="button button--secondary" to="/history">
                Return to history
              </Link>
            }
          >
            <p>This workout may have been removed, or its analysis is no longer available.</p>
          </EmptyState>
        </Page>
      </>
    );
  }

  const matchedExercise =
    historyItem === undefined
      ? selectedExercise
      : exercises.find(
          (item) => item.name.toLocaleLowerCase() === historyItem.title.toLocaleLowerCase(),
        );
  const exercise = matchedExercise ?? selectedExercise;
  const isWorkoutSummary = historyItem !== undefined && matchedExercise === undefined;
  const hasMatchingSession =
    isCurrentAnalysis && session.exerciseSlug === exercise.slug && session.status !== 'idle';
  const sessionCompletedReps = Math.max(
    0,
    (Math.max(1, session.set) - 1) * session.targetReps + session.reps,
  );
  const completedReps =
    historyItem?.completedReps ?? (hasMatchingSession ? sessionCompletedReps : 0);
  const targetReps =
    historyItem?.targetReps ??
    (isCurrentAnalysis
      ? session.totalSets * session.targetReps
      : exercise.defaultSets * exercise.defaultReps);
  const durationSeconds =
    historyItem?.durationSeconds ?? (isCurrentAnalysis ? session.elapsedSeconds : 0);
  const formScore =
    historyItem?.formScore ?? (isCurrentAnalysis ? session.formScore : progress.averageFormScore);
  const setCount = isCurrentAnalysis ? session.totalSets : undefined;
  const hasMeasuredForm = isCurrentAnalysis
    ? session.trackingEnabled
    : historyItem?.trackingEnabled === true;
  const romBase = hasMatchingSession ? session.rangeOfMotion : clamp(formScore - 5, 68, 94);
  const romBarCount = clamp(completedReps || targetReps || exercise.defaultReps, 8, 30);
  const romValues = Array.from({ length: romBarCount }, (_, index) => {
    const offsets = [4, 2, 3, 0, 4, 5, 1, -1, 0, -9, 2, 1, 3, 1, 2, -11, 3, 2, 4, -13];
    return Math.round(clamp(romBase + (offsets[index % offsets.length] ?? 0), 55, 98));
  });
  const averageRom = Math.round(
    romValues.reduce((total, value) => total + value, 0) / romValues.length,
  );
  const consistentReps = romValues.filter((value) => value >= 80).length;
  const consistency = Math.round((consistentReps / romValues.length) * 100);
  const tempo = clamp(2.5 - (formScore - 80) * 0.03, 1.5, 3.2).toFixed(1);
  const performanceLabel = formScore >= 90 ? 'Excellent' : formScore >= 80 ? 'Good' : 'Developing';
  const romLabel = averageRom >= 88 ? 'Great' : averageRom >= 78 ? 'Good' : 'Building';
  const historyCategory = historyItem?.category;
  const relevantExercises = isWorkoutSummary
    ? exercises.filter((item) => {
        if (historyCategory === 'core') return item.bodyRegions.includes('Core');
        return item.category === historyCategory;
      })
    : [exercise];
  const relevantMuscles = [...new Set(relevantExercises.flatMap((item) => item.muscles))];
  const primaryMuscle = relevantMuscles[0] ?? historyCategory ?? 'Target area';
  const secondaryMuscles = relevantMuscles.slice(1, 4).join(', ') || 'Supporting muscles';
  const displayTitle = historyItem?.title ?? exercise.name;
  const displayCategory = historyItem?.category ?? exercise.category;
  const insight =
    hasMeasuredForm && formScore >= 90 && averageRom >= 80
      ? 'Your tracked form score and estimated range suggest strong control. Keep the same steady pace while working through your comfortable range.'
      : historyItem !== undefined && hasMeasuredForm
        ? `Your saved summary reports a ${formScore}% form score. Rep-level tracking detail was not stored, so use this as a general guide.`
        : 'Tracking was off, so form, range, and stability were not measured. Keep choosing a steady pace and a comfortable range.';

  return (
    <>
      <AppHeader />
      <Page wide className="progress-page analysis-screen">
        <PageIntro
          title={
            <>
              <span className="sr-only">{displayTitle}: </span>
              Detailed Analysis
            </>
          }
          subtitle={
            isWorkoutSummary
              ? 'Here is your saved workout summary.'
              : 'Here is how you performed in this exercise.'
          }
        />

        <Surface className="analysis-summary">
          <div className="analysis-summary__exercise">
            <ExerciseArt slug={isWorkoutSummary ? displayCategory : exercise.slug} size={118} />
            <div>
              <span className="eyebrow">
                {displayCategory}
                {isWorkoutSummary ? ' workout' : ''}
              </span>
              <h2>{displayTitle}</h2>
              {historyItem !== undefined ? (
                <p>
                  Completed on{' '}
                  <time dateTime={historyItem.completedAt}>
                    {formatShortDate(historyItem.completedAt)}
                  </time>
                </p>
              ) : (
                <p>Current workout session</p>
              )}
            </div>
          </div>
          <div className="analysis-summary__metrics">
            <div>
              <span>
                <Target size={20} aria-hidden="true" />
              </span>
              <small>Total Reps</small>
              <strong>{targetReps > 0 ? `${completedReps} / ${targetReps}` : 'Timed'}</strong>
            </div>
            <div>
              <span>
                <Layers3 size={20} aria-hidden="true" />
              </span>
              <small>Total Sets</small>
              <strong>{setCount ?? 'Not saved'}</strong>
            </div>
            <div>
              <span>
                <Clock size={20} aria-hidden="true" />
              </span>
              <small>Time</small>
              <strong>{formatDuration(durationSeconds)}</strong>
            </div>
          </div>
        </Surface>

        <Surface className="analysis-rom">
          <div className="panel-heading">
            <div className="analysis-heading-inline">
              <h2>Range of Motion</h2>
              <Info size={17} aria-label="Range of motion requires movement tracking" />
            </div>
            <Tag tone={hasMeasuredForm ? 'accent' : 'neutral'}>
              {hasMeasuredForm ? `Estimate: ${romLabel}` : 'Not tracked'}
            </Tag>
          </div>
          {hasMeasuredForm ? (
            <>
              <div className="analysis-rom__chart-frame">
                <div className="rom-axis" aria-hidden="true">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>
                <RepBarChart values={romValues} />
              </div>
              <p className="analysis-rom__caption">Repetition</p>
              <div className="analysis-rom__legend">
                <span>
                  <i />
                  Your ROM
                </span>
                <span>
                  <i />
                  Target ROM
                </span>
              </div>
              <p className="analysis-data-note">
                Rep-level range is estimated around the available tracked session summary.
              </p>
            </>
          ) : (
            <div className="analysis-unavailable">
              <strong>Range was not measured</strong>
              <p>This session used manual counting, so no range-of-motion chart is available.</p>
            </div>
          )}
        </Surface>

        <section className="analysis-grid" aria-label="Movement analysis details">
          <Surface className="analysis-card consistency-card">
            <div className="analysis-heading-inline">
              <h2>Movement Consistency</h2>
              <Info
                size={17}
                aria-label="Consistency reflects repetitions within your target range"
              />
            </div>
            {hasMeasuredForm ? (
              <>
                <div className="consistency-card__metric">
                  <div
                    role="img"
                    aria-label={`${consistency}% of repetitions reached the target range`}
                  >
                    <ProgressRing value={consistency} label="on target" size={112} />
                  </div>
                  <p>
                    <strong>
                      {consistentReps}/{romValues.length}
                    </strong>{' '}
                    repetitions reached the target range
                  </p>
                </div>
                <p>You maintained a steady available range on most repetitions.</p>
                <small className="analysis-data-note">Estimated from tracked summary data</small>
              </>
            ) : (
              <div className="analysis-unavailable">
                <strong>Not tracked</strong>
                <p>Consistency needs measured range data and is unavailable for this session.</p>
              </div>
            )}
          </Surface>

          <Surface className="analysis-card tempo-card">
            <div className="analysis-heading-inline">
              <h2>Tempo (Avg)</h2>
              <Info size={17} aria-label="Average estimated pace per repetition" />
            </div>
            {hasMeasuredForm ? (
              <>
                <div className="tempo-card__score">
                  <span>
                    <Activity size={27} aria-hidden="true" />
                  </span>
                  <strong>{tempo}s</strong>
                  <Tag tone="accent">Estimate</Tag>
                </div>
                <p>
                  {tempo}s up <i /> 1.0s pause <i /> {tempo}s down
                </p>
                <p>Rep-level tempo was not saved for this session.</p>
              </>
            ) : (
              <div className="analysis-unavailable">
                <strong>Not tracked</strong>
                <p>Use your own comfortable pace. No tempo measurement was recorded.</p>
              </div>
            )}
          </Surface>

          <Surface className="analysis-card form-card">
            <div className="analysis-heading-inline">
              <h2>Stability &amp; Form</h2>
              <Info size={17} aria-label="Form score uses derived movement metrics" />
            </div>
            <div className="form-card__score">
              <ShieldCheck size={46} aria-hidden="true" />
              <strong>{hasMeasuredForm ? `${formScore}%` : 'Not tracked'}</strong>
              <Tag tone="accent">{hasMeasuredForm ? performanceLabel : 'Unavailable'}</Tag>
            </div>
            <p>
              {hasMeasuredForm
                ? 'Your tracked movement stayed stable and controlled through the session.'
                : 'This session used manual counting, so no form score was measured.'}
            </p>
          </Surface>

          <Surface className="analysis-card muscles-card">
            <div className="analysis-heading-inline">
              <h2>{isWorkoutSummary ? 'Muscle Coverage' : 'Muscles Worked'}</h2>
              <Info size={17} aria-label="Muscle groups associated with this exercise" />
            </div>
            <div className="muscles-card__content">
              <MuscleMap compact />
              <dl>
                <div>
                  <dt>
                    <i className="legend-dot legend-dot--high" />
                    {isWorkoutSummary ? 'Main area' : 'Primary'}
                  </dt>
                  <dd>{primaryMuscle}</dd>
                </div>
                <div>
                  <dt>
                    <i className="legend-dot legend-dot--low" />
                    {isWorkoutSummary ? 'Supporting areas' : 'Secondary'}
                  </dt>
                  <dd>{secondaryMuscles}</dd>
                </div>
              </dl>
            </div>
            <small className="analysis-data-note">
              Coverage guide based on the workout category
            </small>
          </Surface>
        </section>

        <aside className="analysis-insight">
          <span className="analysis-insight__icon">
            <Lightbulb size={26} aria-hidden="true" />
          </span>
          <div>
            <strong>Insight</strong>
            <p>{insight}</p>
          </div>
        </aside>

        <Link className="button button--primary analysis-back" to="/dashboard">
          Back to Workout
        </Link>
      </Page>
    </>
  );
};
