import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  ChevronRight,
  Dumbbell,
  Filter,
  Gauge,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  UserRoundSearch,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AppHeader,
  Button,
  Chip,
  EmptyState,
  IconButton,
  Page,
  PageIntro,
  SearchField,
  Tag,
} from '../components/ui';
import { BodyMap, ExerciseArt } from '../components/visuals';
import { useApp } from '../state/AppContext';
import type { Exercise } from '../types';
import './discovery.css';

type CategoryFilter = 'all' | Exercise['category'];
type PositionFilter = 'all' | 'seated' | 'standing' | 'floor';

const categoryFilters: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'strength', label: 'Strength' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'balance', label: 'Balance' },
];

const positionFilters: Array<{ value: PositionFilter; label: string }> = [
  { value: 'all', label: 'Any position' },
  { value: 'seated', label: 'Seated' },
  { value: 'standing', label: 'Standing' },
  { value: 'floor', label: 'Floor' },
];

const suggestionOrder = [
  'seated-shoulder-press',
  'standing-core-twist',
  'chair-march',
  'seated-bicep-curl',
  'resistance-band-row',
];

const difficultyLabel = (difficulty: Exercise['difficulty']): string => {
  if (difficulty <= 1) return 'Beginner';
  if (difficulty <= 3) return 'Intermediate';
  return 'Advanced';
};

const positionMatches = (exercise: Exercise, position: PositionFilter): boolean => {
  if (position === 'all') return true;
  if (position === 'standing') {
    return exercise.position === 'standing' || exercise.position === 'supported-standing';
  }
  return exercise.position === position;
};

const matchesExerciseSearch = (exercise: Exercise, query: string): boolean => {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized.length === 0) return true;
  return [
    exercise.name,
    exercise.summary,
    exercise.category,
    exercise.position,
    ...exercise.bodyRegions,
    ...exercise.muscles,
    ...exercise.equipment,
  ]
    .join(' ')
    .toLocaleLowerCase()
    .includes(normalized);
};

const getCompatibilityCopy = (
  exercise: Exercise,
  avoidRegions: string[],
): { label: string; tone: 'success' | 'warning'; icon: typeof BadgeCheck } => {
  const avoidedMatches = exercise.bodyRegions.filter((region) => avoidRegions.includes(region));
  if (avoidedMatches.length > 0) {
    return {
      label: `Uses a limited area: ${avoidedMatches.join(', ')}`,
      tone: 'warning',
      icon: AlertTriangle,
    };
  }
  if (exercise.compatibility === 'compatible') {
    return { label: 'Matches your movement profile', tone: 'success', icon: BadgeCheck };
  }
  if (exercise.compatibility === 'caution') {
    return { label: 'Review the recommended adaptation', tone: 'warning', icon: AlertTriangle };
  }
  return { label: 'Conflicts with your saved limits', tone: 'warning', icon: AlertTriangle };
};

const ExerciseBookmarkButton = ({
  exercise,
  active,
  onClick,
}: {
  exercise: Exercise;
  active: boolean;
  onClick: () => void;
}) => (
  <IconButton
    label={
      active ? `Remove ${exercise.name} from saved exercises` : `Save ${exercise.name} for later`
    }
    active={active}
    onClick={onClick}
  >
    <Bookmark size={21} fill={active ? 'currentColor' : 'none'} />
  </IconButton>
);

const ExercisePreview = ({
  exercise,
  favorite,
  avoidRegions,
  onFavorite,
  onOpen,
}: {
  exercise: Exercise;
  favorite: boolean;
  avoidRegions: string[];
  onFavorite: () => void;
  onOpen: () => void;
}) => {
  const compatibility = getCompatibilityCopy(exercise, avoidRegions);
  const CompatibilityIcon = compatibility.icon;

  return (
    <article className="exercise-preview">
      <button
        type="button"
        className="exercise-preview-open"
        aria-label={`Open ${exercise.name} overview`}
        onClick={onOpen}
      >
        {exercise.image !== undefined ? (
          <span className="exercise-preview-image">
            <img src={exercise.image} alt="" />
          </span>
        ) : (
          <ExerciseArt slug={exercise.slug} size={92} />
        )}
        <span className="exercise-preview-copy">
          <strong>{exercise.name}</strong>
          <span className="exercise-preview-tags">
            {exercise.bodyRegions.slice(0, 2).map((region) => (
              <Tag key={region}>{region}</Tag>
            ))}
          </span>
          <span className={`exercise-compatibility exercise-compatibility-${compatibility.tone}`}>
            <CompatibilityIcon size={16} aria-hidden="true" />
            {compatibility.label}
          </span>
        </span>
      </button>
      <ExerciseBookmarkButton exercise={exercise} active={favorite} onClick={onFavorite} />
    </article>
  );
};

const ExerciseCatalogRow = ({ exercise, onOpen }: { exercise: Exercise; onOpen: () => void }) => (
  <button
    type="button"
    className="exercise-catalog-row"
    aria-label={`View ${exercise.name}`}
    onClick={onOpen}
  >
    {exercise.image !== undefined ? (
      <span className="exercise-row-image">
        <img src={exercise.image} alt="" />
      </span>
    ) : (
      <ExerciseArt slug={exercise.slug} size={96} />
    )}
    <span className="exercise-row-copy">
      <strong>{exercise.name}</strong>
      <span className="exercise-row-tags">
        {exercise.muscles.slice(0, 2).map((muscle) => (
          <Tag key={muscle}>{muscle}</Tag>
        ))}
      </span>
      <span className="exercise-row-meta">
        <span>
          <Gauge size={16} aria-hidden="true" />
          {difficultyLabel(exercise.difficulty)}
        </span>
        <span>
          <Dumbbell size={16} aria-hidden="true" />
          {exercise.equipment.join(', ')}
        </span>
      </span>
    </span>
    <span className="exercise-row-chevron" aria-hidden="true">
      <ChevronRight size={23} />
    </span>
  </button>
);

export const DiscoveryScreen = () => {
  const {
    constraintMode,
    exercises,
    favorites,
    movementProfile,
    movementProfileSync,
    regions,
    resetRegions,
    selectExercise,
    setConstraintMode,
    toggleFavorite,
    updateRegion,
  } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [position, setPosition] = useState<PositionFilter>('all');

  const suggestions = useMemo(() => {
    const order = new Map(suggestionOrder.map((slug, index) => [slug, index]));
    return exercises
      .filter((exercise) => matchesExerciseSearch(exercise, query))
      .filter((exercise) => category === 'all' || exercise.category === category)
      .filter((exercise) => positionMatches(exercise, position))
      .sort((first, second) => {
        const firstAvoided = first.bodyRegions.some((region) =>
          movementProfile.avoidRegions.includes(region),
        );
        const secondAvoided = second.bodyRegions.some((region) =>
          movementProfile.avoidRegions.includes(region),
        );
        if (firstAvoided !== secondAvoided) return Number(firstAvoided) - Number(secondAvoided);

        const firstIndex = order.get(first.slug) ?? suggestionOrder.length;
        const secondIndex = order.get(second.slug) ?? suggestionOrder.length;
        if (firstIndex !== secondIndex) return firstIndex - secondIndex;

        const firstFocus = first.bodyRegions.some((region) =>
          movementProfile.focusRegions.includes(region),
        );
        const secondFocus = second.bodyRegions.some((region) =>
          movementProfile.focusRegions.includes(region),
        );
        return Number(secondFocus) - Number(firstFocus);
      })
      .slice(0, 5);
  }, [
    category,
    exercises,
    movementProfile.avoidRegions,
    movementProfile.focusRegions,
    position,
    query,
  ]);

  const hasRegionSelections =
    movementProfile.focusRegions.length > 0 || movementProfile.avoidRegions.length > 0;
  const activeFilterCount = Number(category !== 'all') + Number(position !== 'all');

  const openExercise = (exercise: Exercise) => {
    selectExercise(exercise.slug);
    navigate(`/exercises/${exercise.slug}/card`);
  };

  const clearFilters = () => {
    setCategory('all');
    setPosition('all');
  };

  return (
    <>
      <AppHeader />
      <Page wide className="discovery-page">
        <PageIntro
          eyebrow="Build around your movement"
          title="Exercise Discovery"
          subtitle="Choose what you want to strengthen and what you want to limit today."
          centered
        />

        <SearchField
          className="discovery-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search body part or movement"
          aria-label="Search body part or movement"
        />

        <div className="discovery-layout">
          <section className="body-selector" aria-labelledby="body-selector-title">
            <div className="body-selector-heading">
              <div>
                <p className="eyebrow">Your movement map</p>
                <h2 id="body-selector-title">Select an area</h2>
                <p>Tap a label to apply the active mode.</p>
              </div>
              <button
                type="button"
                className="region-reset"
                disabled={!hasRegionSelections}
                onClick={resetRegions}
              >
                <RotateCcw size={18} aria-hidden="true" />
                Reset
              </button>
            </div>

            <fieldset className="constraint-modes">
              <legend className="sr-only">Body region mode</legend>
              <button
                type="button"
                className={constraintMode === 'focus' ? 'is-active' : ''}
                aria-pressed={constraintMode === 'focus'}
                onClick={() => setConstraintMode('focus')}
              >
                <span className="constraint-dot constraint-dot-focus" aria-hidden="true" />
                <span>
                  <strong>Focus</strong>
                  <small>Strengthen</small>
                </span>
              </button>
              <button
                type="button"
                className={constraintMode === 'avoid' ? 'is-active' : ''}
                aria-pressed={constraintMode === 'avoid'}
                onClick={() => setConstraintMode('avoid')}
              >
                <span className="constraint-dot constraint-dot-avoid" aria-hidden="true" />
                <span>
                  <strong>Avoid</strong>
                  <small>Limit use</small>
                </span>
              </button>
            </fieldset>

            <BodyMap
              regions={regions}
              focus={movementProfile.focusRegions}
              avoid={movementProfile.avoidRegions}
              onSelect={updateRegion}
            />

            <div className="region-summary" aria-live="polite">
              <div>
                <strong>Focus</strong>
                <span>
                  {movementProfile.focusRegions.length > 0
                    ? movementProfile.focusRegions.join(', ')
                    : 'No focus areas selected'}
                </span>
              </div>
              <div>
                <strong>Avoid</strong>
                <span>
                  {movementProfile.avoidRegions.length > 0
                    ? movementProfile.avoidRegions.join(', ')
                    : 'No limited areas selected'}
                </span>
              </div>
            </div>
            {movementProfileSync !== 'idle' ? (
              <p
                className={`movement-sync movement-sync--${movementProfileSync}`}
                role={movementProfileSync === 'error' ? 'alert' : 'status'}
              >
                {movementProfileSync === 'saving'
                  ? 'Saving movement profile...'
                  : movementProfileSync === 'saved'
                    ? 'Movement profile saved.'
                    : 'Movement profile could not be saved. Your on-screen changes are still available.'}
              </p>
            ) : null}
          </section>

          <section className="suggestions" aria-labelledby="suggestions-title">
            <div className="suggestions-heading">
              <div>
                <p className="eyebrow">Personalized starting points</p>
                <h2 id="suggestions-title">Suggested Exercises</h2>
                <span className="result-count" role="status">
                  {suggestions.length} {suggestions.length === 1 ? 'suggestion' : 'suggestions'}
                </span>
              </div>
              <button
                type="button"
                className={`filter-button ${filtersOpen ? 'is-active' : ''}`}
                aria-expanded={filtersOpen}
                aria-controls="discovery-filters"
                onClick={() => setFiltersOpen((current) => !current)}
              >
                <SlidersHorizontal size={18} aria-hidden="true" />
                Filters
                {activeFilterCount > 0 ? <span>{activeFilterCount}</span> : null}
              </button>
            </div>

            {filtersOpen ? (
              <div id="discovery-filters" className="discovery-filters">
                <fieldset className="filter-group">
                  <legend>Category</legend>
                  <div className="filter-chips">
                    {categoryFilters.map((filter) => (
                      <Chip
                        key={filter.value}
                        type="button"
                        active={category === filter.value}
                        onClick={() => setCategory(filter.value)}
                      >
                        {filter.label}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="filter-group">
                  <legend>Position</legend>
                  <div className="filter-chips">
                    {positionFilters.map((filter) => (
                      <Chip
                        key={filter.value}
                        type="button"
                        active={position === filter.value}
                        onClick={() => setPosition(filter.value)}
                      >
                        {filter.label}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
                {activeFilterCount > 0 ? (
                  <button type="button" className="clear-filter-button" onClick={clearFilters}>
                    <X size={17} aria-hidden="true" />
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="suggestion-list">
              {suggestions.map((exercise) => (
                <ExercisePreview
                  key={exercise.id}
                  exercise={exercise}
                  favorite={favorites.has(exercise.slug)}
                  avoidRegions={movementProfile.avoidRegions}
                  onFavorite={() => toggleFavorite(exercise.slug)}
                  onOpen={() => openExercise(exercise)}
                />
              ))}
            </div>

            {suggestions.length === 0 ? (
              <EmptyState
                title="No exercises match yet"
                action={
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      clearFilters();
                    }}
                  >
                    Clear Search and Filters
                  </Button>
                }
              >
                <p>Try another movement, category, or position.</p>
              </EmptyState>
            ) : null}

            <div className="suggestion-footer">
              <p>
                <Sparkles size={18} aria-hidden="true" />
                Suggestions update with your selections. Review cautions before starting.
              </p>
              <Link to="/exercises">
                View all exercises
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </Page>
    </>
  );
};

export const ExerciseSelectionScreen = () => {
  const { exercises, favorites, selectExercise } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const savedParam = searchParams.get('saved') === '1';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [position, setPosition] = useState<PositionFilter>('all');
  const [savedOnly, setSavedOnly] = useState(savedParam);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!savedParam) return;
    setSavedOnly(true);
    setCategory('all');
  }, [savedParam]);

  const filteredExercises = useMemo(
    () =>
      exercises.filter(
        (exercise) =>
          matchesExerciseSearch(exercise, query) &&
          (category === 'all' || exercise.category === category) &&
          positionMatches(exercise, position) &&
          (!savedOnly || favorites.has(exercise.slug)),
      ),
    [category, exercises, favorites, position, query, savedOnly],
  );

  const openExercise = (exercise: Exercise) => {
    selectExercise(exercise.slug);
    navigate(`/exercises/${exercise.slug}/card`);
  };

  const resetCatalog = () => {
    setQuery('');
    setCategory('all');
    setPosition('all');
    setSavedOnly(false);
  };

  return (
    <>
      <AppHeader action="none" />
      <Page className="selection-page">
        <PageIntro
          eyebrow="Explore the library"
          title="Exercise Selection"
          subtitle="Find a movement that fits your setup and goals."
          centered
        />

        <SearchField
          className="selection-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for an exercise"
          aria-label="Search for an exercise"
        />

        <fieldset className="catalog-chip-row">
          <legend className="sr-only">Exercise categories</legend>
          {categoryFilters.map((filter) => (
            <Chip
              key={filter.value}
              type="button"
              active={category === filter.value && !savedOnly}
              onClick={() => {
                setSavedOnly(false);
                setCategory(filter.value);
              }}
            >
              {filter.label}
            </Chip>
          ))}
          <Chip
            type="button"
            active={savedOnly}
            onClick={() => {
              const nextSavedOnly = !savedOnly;
              setSavedOnly(nextSavedOnly);
              if (nextSavedOnly) setCategory('all');
            }}
          >
            Saved
          </Chip>
        </fieldset>

        <section className="catalog-section" aria-labelledby="catalog-title">
          <div className="catalog-heading">
            <div>
              <h2 id="catalog-title">All Exercises</h2>
              <span role="status">{filteredExercises.length} available</span>
            </div>
            <button
              type="button"
              className={`filter-button ${filtersOpen ? 'is-active' : ''}`}
              aria-expanded={filtersOpen}
              aria-controls="catalog-filters"
              onClick={() => setFiltersOpen((current) => !current)}
            >
              <Filter size={18} aria-hidden="true" />
              Filters
            </button>
          </div>

          {filtersOpen ? (
            <fieldset id="catalog-filters" className="catalog-filters">
              <legend>Exercise position</legend>
              <div className="filter-chips">
                {positionFilters.map((filter) => (
                  <Chip
                    key={filter.value}
                    type="button"
                    active={position === filter.value}
                    onClick={() => setPosition(filter.value)}
                  >
                    {filter.label}
                  </Chip>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="exercise-catalog-list">
            {filteredExercises.map((exercise) => (
              <ExerciseCatalogRow
                key={exercise.id}
                exercise={exercise}
                onOpen={() => openExercise(exercise)}
              />
            ))}
          </div>

          {filteredExercises.length === 0 ? (
            <EmptyState
              title={savedOnly ? 'No saved exercises yet' : 'No exercises found'}
              action={
                <Button type="button" variant="secondary" onClick={resetCatalog}>
                  Show All Exercises
                </Button>
              }
            >
              <p>
                {savedOnly
                  ? 'Save exercises from Discovery and they will appear here.'
                  : 'Clear the search or adjust your filters.'}
              </p>
            </EmptyState>
          ) : null}
        </section>
      </Page>
    </>
  );
};

export const ExerciseCardScreen = () => {
  const { exercises, favorites, selectExercise, toggleFavorite } = useApp();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const exercise = exercises.find((item) => item.slug === slug);

  useEffect(() => {
    if (exercise !== undefined) selectExercise(exercise.slug);
  }, [exercise, selectExercise]);

  const relatedExercises = useMemo(() => {
    if (exercise === undefined) return [];
    return exercises
      .filter((item) => item.slug !== exercise.slug)
      .map((item) => ({
        exercise: item,
        overlap: item.muscles.filter((muscle) => exercise.muscles.includes(muscle)).length,
        sameCategory: Number(item.category === exercise.category),
      }))
      .sort(
        (first, second) =>
          second.overlap - first.overlap || second.sameCategory - first.sameCategory,
      )
      .slice(0, 2)
      .map((item) => item.exercise);
  }, [exercise, exercises]);

  const openRelated = (related: Exercise) => {
    selectExercise(related.slug);
    navigate(`/exercises/${related.slug}/card`);
  };

  if (exercise === undefined) {
    return (
      <>
        <AppHeader action="none" />
        <Page className="exercise-card-page">
          <EmptyState
            title="Exercise not found"
            headingLevel="h1"
            action={
              <Button type="button" variant="secondary" onClick={() => navigate('/exercises')}>
                Browse Exercises
              </Button>
            }
          >
            <p>This exercise may have moved or is not available in your catalog.</p>
          </EmptyState>
        </Page>
      </>
    );
  }

  return (
    <>
      <AppHeader action="none" />
      <Page className="exercise-card-page">
        <PageIntro
          eyebrow="At a glance"
          title={
            <>
              <span className="sr-only">{exercise.name}: </span>
              Exercise Card
            </>
          }
          subtitle="See how this movement fits your goals before opening the full guide."
          centered
        />

        <article className="exercise-feature-card">
          <div className="exercise-feature-art">
            {exercise.image !== undefined ? (
              <img src={exercise.image} alt={`${exercise.name} demonstration`} />
            ) : (
              <ExerciseArt slug={exercise.slug} size={260} />
            )}
          </div>

          <div className="exercise-feature-copy">
            <div className="exercise-feature-title">
              <div>
                <p className="eyebrow">{exercise.category}</p>
                <h2>{exercise.name}</h2>
              </div>
              <ExerciseBookmarkButton
                exercise={exercise}
                active={favorites.has(exercise.slug)}
                onClick={() => toggleFavorite(exercise.slug)}
              />
            </div>

            <dl className="exercise-feature-facts">
              <div>
                <dt>
                  <UserRoundSearch size={20} aria-hidden="true" />
                  Muscles
                </dt>
                <dd>{exercise.muscles.join(', ')}</dd>
              </div>
              <div>
                <dt>
                  <Gauge size={20} aria-hidden="true" />
                  Difficulty
                </dt>
                <dd>{difficultyLabel(exercise.difficulty)}</dd>
              </div>
              <div>
                <dt>
                  <Dumbbell size={20} aria-hidden="true" />
                  Equipment
                </dt>
                <dd>{exercise.equipment.join(', ')}</dd>
              </div>
            </dl>

            <p className="exercise-feature-summary">{exercise.summary}</p>

            <Button
              className="exercise-feature-action"
              type="button"
              icon={<ArrowRight size={20} aria-hidden="true" />}
              onClick={() => navigate(`/exercises/${exercise.slug}`)}
            >
              View Details
            </Button>
          </div>
        </article>

        <section className="related-section" aria-labelledby="related-title">
          <div className="related-heading">
            <div>
              <p className="eyebrow">Keep exploring</p>
              <h2 id="related-title">Related Exercises</h2>
            </div>
            <Link to="/exercises">
              View All
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <div className="related-grid">
            {relatedExercises.map((related) => (
              <article key={related.id} className="related-card">
                <button
                  type="button"
                  className="related-card-open"
                  aria-label={`Open ${related.name} overview`}
                  onClick={() => openRelated(related)}
                >
                  <ExerciseArt slug={related.slug} size={82} />
                  <span className="related-card-copy">
                    <strong>{related.name}</strong>
                    <span className="related-card-tags">
                      {related.muscles.slice(0, 2).map((muscle) => (
                        <Tag key={muscle}>{muscle}</Tag>
                      ))}
                    </span>
                    <small>
                      {difficultyLabel(related.difficulty)} · {related.equipment.join(', ')}
                    </small>
                  </span>
                </button>
                <ExerciseBookmarkButton
                  exercise={related}
                  active={favorites.has(related.slug)}
                  onClick={() => toggleFavorite(related.slug)}
                />
              </article>
            ))}
          </div>

          <p className="bookmark-guidance">
            <BadgeCheck size={19} aria-hidden="true" />
            Save an exercise to find it quickly in the exercise library.
          </p>
        </section>
      </Page>
    </>
  );
};
