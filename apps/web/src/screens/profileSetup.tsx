import {
  Accessibility,
  Activity,
  Brain,
  Check,
  ChevronLeft,
  Dumbbell,
  Ear,
  Eye,
  Hand,
  HeartPulse,
  Scale,
  ShieldPlus,
  Target,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BodyDiagram, RegionLegend } from '../components/bodyDiagram';
import { AppHeader, Button, Page, PageIntro, Surface } from '../components/ui';
import {
  accessibilityOptions,
  bodyRegions,
  equipmentOptions,
  goalOptions,
  movementStyleOptions,
  regionLabel,
  regionStatusLabels,
  regionStatusOrder,
} from '../data/profileOptions';
import { useApp } from '../state/AppContext';
import type {
  AccessibilityNeedId,
  BodySide,
  EquipmentId,
  GoalId,
  MovementStyleId,
  RegionStatus,
} from '../types';
import './profileSetup.css';

/** Ordered so each screen knows where Back and Continue lead without hardcoding twice. */
const setupSteps = [
  '/onboarding/goals',
  '/onboarding/movement',
  '/onboarding/styles',
  '/onboarding/equipment',
  '/onboarding/accessibility',
] as const;

const goalIcons: Record<GoalId, ReactNode> = {
  'build-strength': <Dumbbell size={22} />,
  'improve-mobility': <Activity size={22} />,
  'increase-endurance': <HeartPulse size={22} />,
  'lose-weight': <Scale size={22} />,
  'general-fitness': <Target size={22} />,
  'rehab-recovery': <ShieldPlus size={22} />,
};

const accessibilityIcons: Record<AccessibilityNeedId, ReactNode> = {
  'visual-impairment': <Eye size={22} />,
  'hearing-impairment': <Ear size={22} />,
  'reduced-mobility': <Accessibility size={22} />,
  'one-handed-use': <Hand size={22} />,
  'cognitive-considerations': <Brain size={22} />,
};

const SetupProgress = ({ step }: { step: number }) => (
  <div className="setup-progress">
    <p className="setup-progress__label">
      Step {step + 1} of {setupSteps.length}
    </p>
    <ol className="setup-progress__track">
      {setupSteps.map((path, index) => (
        <li
          key={path}
          className={index <= step ? 'is-complete' : ''}
          aria-current={index === step ? 'step' : undefined}
        >
          <span className="sr-only">
            Step {index + 1}
            {index === step ? ', current' : ''}
          </span>
        </li>
      ))}
    </ol>
  </div>
);

const SetupShell = ({
  step,
  title,
  subtitle,
  eyebrow,
  children,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  hint,
}: {
  step: number;
  title: string;
  subtitle: string;
  eyebrow: string;
  children: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  hint?: string;
}) => {
  const navigate = useNavigate();
  const previous = step === 0 ? '/welcome' : setupSteps[step - 1];

  return (
    <>
      <AppHeader action="none" />
      <Page className="setup-page">
        <button type="button" className="setup-back" onClick={() => navigate(previous)}>
          <ChevronLeft size={20} aria-hidden="true" />
          Back
        </button>
        <SetupProgress step={step} />
        <PageIntro eyebrow={eyebrow} title={title} subtitle={subtitle} />
        {children}
        <div className="setup-actions">
          <Button type="button" onClick={onContinue} disabled={continueDisabled}>
            {continueLabel}
          </Button>
          {hint !== undefined ? <p className="setup-hint">{hint}</p> : null}
        </div>
      </Page>
    </>
  );
};

/**
 * Multi-select list shared by the goals, styles, and equipment steps. Rendered as real
 * checkboxes so keyboard and screen-reader behaviour comes from the platform.
 */
const ChoiceList = <Id extends string>({
  options,
  selected,
  onToggle,
  icons,
  columns = false,
}: {
  options: ReadonlyArray<{ id: Id; label: string; description?: string }>;
  selected: readonly Id[];
  onToggle: (id: Id) => void;
  icons?: Record<Id, ReactNode>;
  columns?: boolean;
}) => (
  <ul className={`choice-list ${columns ? 'choice-list--columns' : ''}`}>
    {options.map((option) => {
      const isSelected = selected.includes(option.id);
      return (
        <li key={option.id}>
          <label className={`choice ${isSelected ? 'is-selected' : ''}`}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(option.id)}
              className="sr-only"
            />
            {icons !== undefined ? (
              <span className="choice__icon" aria-hidden="true">
                {icons[option.id]}
              </span>
            ) : null}
            <span className="choice__body">
              <strong>{option.label}</strong>
              {option.description !== undefined ? <small>{option.description}</small> : null}
            </span>
            <span className="choice__check" aria-hidden="true">
              {isSelected ? <Check size={15} strokeWidth={3} /> : null}
            </span>
          </label>
        </li>
      );
    })}
  </ul>
);

const useToggle = <Id extends string>(
  selected: readonly Id[],
  commit: (next: Id[]) => void,
): ((id: Id) => void) =>
  useCallback(
    (id: Id) => {
      commit(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
    },
    [commit, selected],
  );

export const GoalsScreen = () => {
  const navigate = useNavigate();
  const { movementProfile, updateProfile } = useApp();
  const selected = movementProfile.goalIds;
  const toggle = useToggle<GoalId>(selected, (goalIds) => updateProfile({ goalIds }));

  return (
    <SetupShell
      step={0}
      eyebrow="Build your profile"
      title="What's your main goal?"
      subtitle="You can choose more than one. We use this to weight which movements you see first."
      onContinue={() => navigate(setupSteps[1])}
      continueDisabled={selected.length === 0}
      hint={selected.length === 0 ? 'Pick at least one goal to continue.' : undefined}
    >
      <ChoiceList options={goalOptions} selected={selected} onToggle={toggle} icons={goalIcons} />
    </SetupShell>
  );
};

export const MovementMapScreen = () => {
  const navigate = useNavigate();
  const { movementProfile, setRegionStatus, updateProfile } = useApp();
  const [side, setSide] = useState<BodySide>('front');
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const notesId = useId();

  const marked = useMemo(
    () => Object.entries(movementProfile.regions).filter(([, status]) => status !== 'none'),
    [movementProfile.regions],
  );

  return (
    <SetupShell
      step={1}
      eyebrow="Build your profile"
      title="Map your movement"
      subtitle="Select the areas that describe you. Anything marked Pain / Avoid is routed around when we build a workout."
      onContinue={() => navigate(setupSteps[2])}
      hint="Nothing marked? That's fine — you can add areas any time from your profile."
    >
      <Surface className="movement-map">
        <fieldset className="movement-map__sides">
          <legend className="sr-only">Body side</legend>
          {(['front', 'back'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={side === value}
              className={side === value ? 'is-active' : ''}
              onClick={() => {
                setSide(value);
                setActiveRegionId(null);
              }}
            >
              {value === 'front' ? 'Front' : 'Back'}
            </button>
          ))}
        </fieldset>

        <BodyDiagram
          side={side}
          regions={movementProfile.regions}
          onSelectRegion={setActiveRegionId}
          activeRegionId={activeRegionId}
        />

        {activeRegionId !== null ? (
          <div className="region-editor">
            <p className="region-editor__title">{regionLabel(activeRegionId)}</p>
            <div className="region-editor__options">
              {regionStatusOrder.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`region-option region-option--${status} ${
                    (movementProfile.regions[activeRegionId] ?? 'none') === status
                      ? 'is-active'
                      : ''
                  }`}
                  onClick={() => setRegionStatus(activeRegionId, status)}
                >
                  {regionStatusLabels[status]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="region-editor__prompt">
            Select any marker on the diagram to describe how that area feels.
          </p>
        )}

        <RegionLegend />
      </Surface>

      <Surface className="movement-notes">
        <label htmlFor={notesId}>
          <strong>Notes</strong>
          <span>(optional)</span>
        </label>
        <textarea
          id={notesId}
          rows={3}
          placeholder="Add anything else about how you move — old injuries, good and bad days, what helps."
          value={movementProfile.regionNotes}
          onChange={(event) => updateProfile({ regionNotes: event.target.value })}
        />
        {marked.length > 0 ? (
          <p className="movement-notes__summary">
            {marked.length} area{marked.length === 1 ? '' : 's'} marked:{' '}
            {marked.map(([id]) => regionLabel(id)).join(', ')}
          </p>
        ) : null}
      </Surface>
    </SetupShell>
  );
};

export const MovementStylesScreen = () => {
  const navigate = useNavigate();
  const { movementProfile, updateProfile } = useApp();
  const selected = movementProfile.styles;
  const toggle = useToggle<MovementStyleId>(selected, (styles) => updateProfile({ styles }));

  return (
    <SetupShell
      step={2}
      eyebrow="Build your profile"
      title="How do you like to move?"
      subtitle="Select all that apply. We lean toward these styles when there's more than one good option."
      onContinue={() => navigate(setupSteps[3])}
      continueDisabled={selected.length === 0}
      hint={selected.length === 0 ? 'Pick at least one style to continue.' : undefined}
    >
      <ChoiceList options={movementStyleOptions} selected={selected} onToggle={toggle} />
    </SetupShell>
  );
};

export const EquipmentScreen = () => {
  const navigate = useNavigate();
  const { movementProfile, updateProfile } = useApp();
  const selected = movementProfile.equipmentIds;

  /** "None" is exclusive: selecting it clears everything else, and vice versa. */
  const toggle = useCallback(
    (id: EquipmentId) => {
      if (id === 'none') {
        updateProfile({ equipmentIds: selected.includes('none') ? [] : ['none'] });
        return;
      }
      const withoutNone = selected.filter((item) => item !== 'none');
      updateProfile({
        equipmentIds: withoutNone.includes(id)
          ? withoutNone.filter((item) => item !== id)
          : [...withoutNone, id],
      });
    },
    [selected, updateProfile],
  );

  return (
    <SetupShell
      step={3}
      eyebrow="Build your profile"
      title="What equipment do you have?"
      subtitle="Select all that apply. Bodyweight movements are always included, whatever you pick."
      onContinue={() => navigate(setupSteps[4])}
      continueDisabled={selected.length === 0}
      hint={selected.length === 0 ? 'Choose your equipment, or pick None.' : undefined}
    >
      <ChoiceList options={equipmentOptions} selected={selected} onToggle={toggle} columns />
    </SetupShell>
  );
};

export const AccessibilityScreen = () => {
  const navigate = useNavigate();
  const { movementProfile, updateProfile, completeOnboarding } = useApp();
  const { accessibility } = movementProfile;
  const notesId = useId();

  const toggle = useCallback(
    (id: AccessibilityNeedId) => {
      const needs = accessibility.needs.includes(id)
        ? accessibility.needs.filter((need) => need !== id)
        : [...accessibility.needs, id];
      updateProfile({ accessibility: { ...accessibility, needs } });
    },
    [accessibility, updateProfile],
  );

  return (
    <SetupShell
      step={4}
      eyebrow="Build your profile"
      title="Accessibility Preferences"
      subtitle="Help us tailor your experience. Everything here is optional and can be changed later."
      continueLabel="Finish setup"
      onContinue={() => {
        completeOnboarding();
        navigate('/profile/summary');
      }}
    >
      <Surface className="accessibility-list">
        <h2 className="sr-only">Accessibility needs</h2>
        {accessibilityOptions.map((option) => {
          const checked = accessibility.needs.includes(option.id);
          return (
            <label key={option.id} className="switch-row">
              <span className="switch-row__icon" aria-hidden="true">
                {accessibilityIcons[option.id]}
              </span>
              <span className="switch-row__body">
                <strong>{option.label}</strong>
                {option.description !== undefined ? <small>{option.description}</small> : null}
              </span>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option.id)}
                className="switch-row__input"
              />
              <span className="switch" aria-hidden="true" />
            </label>
          );
        })}
      </Surface>

      <Surface className="movement-notes">
        <label htmlFor={notesId}>
          <strong>Other needs or notes</strong>
          <span>(optional)</span>
        </label>
        <textarea
          id={notesId}
          rows={3}
          placeholder="Tell us anything else that can help us personalize your experience."
          value={accessibility.notes}
          onChange={(event) =>
            updateProfile({ accessibility: { ...accessibility, notes: event.target.value } })
          }
        />
      </Surface>
    </SetupShell>
  );
};

export const EditMovementProfileScreen = () => {
  const navigate = useNavigate();
  const { movementProfile, setRegionStatus, updateProfile, movementProfileSync } = useApp();
  const [side, setSide] = useState<BodySide>('front');
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const notesId = useId();

  const sideRegionCount = bodyRegions.filter((region) => region.side === side).length;

  return (
    <>
      <AppHeader action="none" />
      <Page className="setup-page">
        <button type="button" className="setup-back" onClick={() => navigate('/profile/summary')}>
          <ChevronLeft size={20} aria-hidden="true" />
          Profile Summary
        </button>
        <PageIntro
          eyebrow="Movement profile"
          title="Edit Movement Profile"
          subtitle={`Update how each area feels. ${sideRegionCount} areas on this view.`}
        />

        <Surface className="movement-map">
          <fieldset className="movement-map__sides">
            <legend className="sr-only">Body side</legend>
            {(['front', 'back'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={side === value}
                className={side === value ? 'is-active' : ''}
                onClick={() => {
                  setSide(value);
                  setActiveRegionId(null);
                }}
              >
                {value === 'front' ? 'Front' : 'Back'}
              </button>
            ))}
          </fieldset>

          <BodyDiagram
            side={side}
            regions={movementProfile.regions}
            onSelectRegion={setActiveRegionId}
            activeRegionId={activeRegionId}
          />

          {activeRegionId !== null ? (
            <div className="region-editor">
              <p className="region-editor__title">{regionLabel(activeRegionId)}</p>
              <div className="region-editor__options">
                {regionStatusOrder.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`region-option region-option--${status} ${
                      (movementProfile.regions[activeRegionId] ?? 'none') === status
                        ? 'is-active'
                        : ''
                    }`}
                    onClick={() => setRegionStatus(activeRegionId, status)}
                  >
                    {regionStatusLabels[status]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="region-editor__prompt">
              Select any marker on the diagram to update that area.
            </p>
          )}

          <RegionLegend />
        </Surface>

        <Surface className="movement-notes">
          <label htmlFor={notesId}>
            <strong>Notes</strong>
            <span>(optional)</span>
          </label>
          <textarea
            id={notesId}
            rows={3}
            placeholder="Add any notes about your movement here..."
            value={movementProfile.regionNotes}
            onChange={(event) => updateProfile({ regionNotes: event.target.value })}
          />
        </Surface>

        <div className="setup-actions">
          <Button type="button" onClick={() => navigate('/profile/summary')}>
            Save Changes
          </Button>
          <p className="setup-hint" role="status">
            {movementProfileSync === 'saving'
              ? 'Saving your profile…'
              : movementProfileSync === 'error'
                ? 'Changes are saved on this device but could not reach the server.'
                : 'Changes save as you make them.'}
          </p>
        </div>
      </Page>
    </>
  );
};

export type { RegionStatus };
