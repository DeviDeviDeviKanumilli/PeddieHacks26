import {
  ArrowRight,
  Clock,
  Dumbbell,
  Lightbulb,
  Plus,
  Search,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppHeader,
  BottomNav,
  Button,
  EmptyState,
  formatDuration,
  Page,
  Surface,
  Tag,
} from '../components/ui';
import { useApp } from '../state/AppContext';
import './home.css';

const greetingForHour = (hour: number): string => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const HomeScreen = () => {
  const navigate = useNavigate();
  const { user, todaysPlan, dailyTip, progress, history, startPlan, exercises } = useApp();
  const greeting = greetingForHour(new Date().getHours());
  const firstName = user.displayName.split(' ')[0];

  const planExercises =
    todaysPlan === null
      ? []
      : todaysPlan.items
          .map((item) => exercises.find((exercise) => exercise.slug === item.exerciseSlug))
          .filter((exercise) => exercise !== undefined);

  return (
    <>
      <AppHeader action="bell" />
      <Page wide className="home-screen">
        <div className="home-greeting">
          <p>{greeting},</p>
          <h1>{firstName}</h1>
        </div>

        {todaysPlan === null ? (
          <Surface className="home-plan home-plan--empty">
            <EmptyState
              title="No plan yet"
              action={
                <Button type="button" icon={<Plus size={19} />} onClick={() => navigate('/build')}>
                  Build a workout
                </Button>
              }
            >
              Build your first workout and it will show up here each day.
            </EmptyState>
          </Surface>
        ) : (
          <Surface className="home-plan">
            <div className="home-plan__header">
              <div>
                <p className="eyebrow">Today's Plan</p>
                <h2>{todaysPlan.title}</h2>
              </div>
              <span className="home-plan__glyph" aria-hidden="true">
                <Sparkles size={26} />
              </span>
            </div>

            <p className="home-plan__meta">
              <span>
                <Dumbbell size={17} aria-hidden="true" />
                {todaysPlan.items.length} Exercises
              </span>
              <span>
                <Clock size={17} aria-hidden="true" />
                {todaysPlan.estimatedMinutes} min
              </span>
            </p>

            {planExercises.length > 0 ? (
              <ul className="home-plan__preview">
                {planExercises.slice(0, 3).map((exercise) => (
                  <li key={exercise.slug}>{exercise.name}</li>
                ))}
                {planExercises.length > 3 ? (
                  <li className="home-plan__more">+{planExercises.length - 3} more</li>
                ) : null}
              </ul>
            ) : null}

            <Button
              type="button"
              icon={<ArrowRight size={19} aria-hidden="true" />}
              className="home-plan__start"
              onClick={() => {
                startPlan(todaysPlan);
                navigate('/workout/plan');
              }}
            >
              Start Workout
            </Button>
          </Surface>
        )}

        {dailyTip !== null ? (
          <Surface className="home-tip">
            <span className="home-tip__icon" aria-hidden="true">
              <Lightbulb size={22} />
            </span>
            <div>
              <strong>{dailyTip.title}</strong>
              <p>{dailyTip.body}</p>
            </div>
          </Surface>
        ) : null}

        <section aria-labelledby="quick-actions-heading" className="home-actions">
          <h2 id="quick-actions-heading">Quick Actions</h2>
          <div className="home-actions__grid">
            <Link to="/build" className="quick-action">
              <span className="quick-action__icon" aria-hidden="true">
                <Dumbbell size={21} />
              </span>
              Build Workout
            </Link>
            <Link to="/discover" className="quick-action">
              <span className="quick-action__icon" aria-hidden="true">
                <Search size={21} />
              </span>
              Explore
            </Link>
          </div>
        </section>

        <section aria-labelledby="home-snapshot-heading" className="home-snapshot">
          <h2 id="home-snapshot-heading">This week</h2>
          <Surface className="home-snapshot__row">
            <div>
              <span>Workouts</span>
              <strong>{progress.weeklyWorkouts}</strong>
            </div>
            <div>
              <span>Active time</span>
              <strong>{formatDuration(progress.weeklySeconds)}</strong>
            </div>
            <div>
              <span>Reps</span>
              <strong>{progress.weeklyReps.toLocaleString()}</strong>
            </div>
          </Surface>
        </section>

        {history.length > 0 ? (
          <section aria-labelledby="home-recent-heading" className="home-recent">
            <div className="home-recent__header">
              <h2 id="home-recent-heading">Recent</h2>
              <Link to="/progress">View all</Link>
            </div>
            <ul>
              {history.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Link to={`/analysis/${encodeURIComponent(item.id)}`}>
                    <span className="home-recent__icon" aria-hidden="true">
                      <Trophy size={18} />
                    </span>
                    <span className="home-recent__body">
                      <strong>{item.title}</strong>
                      <small>
                        {item.completedReps} reps · {formatDuration(item.durationSeconds)}
                      </small>
                    </span>
                    {item.trackingEnabled === true ? (
                      <Tag tone="success">{item.formScore}%</Tag>
                    ) : (
                      <Tag tone="neutral">Manual</Tag>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Page>
      <BottomNav />
    </>
  );
};
