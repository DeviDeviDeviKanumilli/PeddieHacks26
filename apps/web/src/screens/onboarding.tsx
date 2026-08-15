import {
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Pencil,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark, Button, StatusBar } from '../components/ui';
import { ExerciseArt } from '../components/visuals';
import { useApp } from '../state/AppContext';
import './onboarding.css';

type AuthView = 'sign-in' | 'sign-up';

type FieldErrors = {
  displayName?: string;
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateAuth = (
  view: AuthView,
  displayName: string,
  email: string,
  password: string,
): FieldErrors => {
  const errors: FieldErrors = {};
  if (view === 'sign-up' && displayName.trim().length < 2) {
    errors.displayName = 'Enter the name you would like us to use.';
  }
  if (!emailPattern.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (password.length < 8) {
    errors.password = 'Use at least 8 characters.';
  }
  return errors;
};

export const WelcomeScreen = () => {
  const navigate = useNavigate();

  return (
    <main className="onboarding-shell welcome-screen">
      <StatusBar />
      <div className="welcome-layout">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-brand">
            <BrandMark />
            <span>Movement that meets you where you are</span>
          </div>

          <div
            className="welcome-visual"
            role="img"
            aria-label="A preview of adaptive workout feedback"
          >
            <span className="welcome-scan-corner welcome-scan-corner-top" aria-hidden="true" />
            <span className="welcome-scan-corner welcome-scan-corner-bottom" aria-hidden="true" />
            <div className="welcome-person" aria-hidden="true">
              <ExerciseArt slug="bodyweight-squat" size={230} />
              <span className="welcome-person-pulse" />
            </div>

            <div className="welcome-signal welcome-signal-activity">
              <Activity size={19} aria-hidden="true" />
              <span>Muscle activity</span>
              <strong>Balanced</strong>
            </div>
            <div className="welcome-signal welcome-signal-range">
              <ScanLine size={19} aria-hidden="true" />
              <span>Range of motion</span>
              <strong>85%</strong>
            </div>
            <div className="welcome-signal welcome-signal-form">
              <CheckCircle2 size={19} aria-hidden="true" />
              <span>Form score</span>
              <strong>92%</strong>
            </div>
            <div className="welcome-signal welcome-signal-reps">
              <Sparkles size={19} aria-hidden="true" />
              <span>Reps</span>
              <strong>12 of 15</strong>
            </div>
          </div>
        </section>

        <section className="welcome-copy">
          <p className="eyebrow">Adaptive training, made personal</p>
          <h1 id="welcome-title">Smarter workouts. Real results.</h1>
          <p>
            Movement-aware guidance, clear adaptations, and optional form tracking help you train
            with more confidence every day.
          </p>

          <div className="welcome-pagination" role="img" aria-label="Welcome step 1 of 3">
            <span className="is-active" />
            <span />
            <span />
          </div>

          <div className="welcome-actions">
            <Button type="button" onClick={() => navigate('/discover')}>
              Get Started
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/sign-in')}>
              Log In
            </Button>
          </div>

          <p className="welcome-legal">
            Prototype preview: Terms of Service and Privacy Policy documents are not included. Demo
            workout data stays in this browser.
          </p>
        </section>
      </div>
    </main>
  );
};

export const AuthScreen = () => {
  const { isLiveAvailable, mode, setMode, signIn, signUp } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const fieldId = useId();
  const [view, setView] = useState<AuthView>(
    location.pathname.includes('sign-up') ? 'sign-up' : 'sign-in',
  );
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${view === 'sign-in' ? 'Sign In' : 'Create Account'} | AdaptFit`;
    return () => {
      document.title = previousTitle;
    };
  }, [view]);

  const selectView = (nextView: AuthView) => {
    setView(nextView);
    setErrors({});
    setMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAuth(view, displayName, email, password);
    setErrors(nextErrors);
    setMessage(null);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidId =
        nextErrors.displayName !== undefined
          ? `${fieldId}-name`
          : nextErrors.email !== undefined
            ? `${fieldId}-email`
            : `${fieldId}-password`;
      window.setTimeout(() => document.getElementById(firstInvalidId)?.focus(), 0);
      return;
    }

    setSubmitting(true);
    try {
      const result =
        view === 'sign-in'
          ? await signIn(email.trim(), password)
          : await signUp(displayName.trim(), email.trim(), password);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      navigate(view === 'sign-up' ? '/profile/summary' : '/dashboard');
    } catch {
      setMessage('We could not reach AdaptFit. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="onboarding-shell auth-screen">
      <StatusBar />
      <div className="auth-layout">
        <Link className="auth-brand" to="/" aria-label="Back to AdaptFit welcome">
          <BrandMark />
        </Link>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-heading">
            <span className="auth-heading-icon" aria-hidden="true">
              <ShieldCheck size={26} />
            </span>
            <p className="eyebrow">Your private training space</p>
            <h1 id="auth-title" aria-live="polite">
              {view === 'sign-in' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p>
              {view === 'sign-in'
                ? 'Pick up where you left off.'
                : 'Save your movement preferences and progress.'}
            </p>
          </div>

          <fieldset className="auth-tabs">
            <legend className="sr-only">Account action</legend>
            <button
              type="button"
              aria-pressed={view === 'sign-in'}
              className={view === 'sign-in' ? 'is-active' : ''}
              disabled={submitting}
              onClick={() => selectView('sign-in')}
            >
              Sign In
            </button>
            <button
              type="button"
              aria-pressed={view === 'sign-up'}
              className={view === 'sign-up' ? 'is-active' : ''}
              disabled={submitting}
              onClick={() => selectView('sign-up')}
            >
              Sign Up
            </button>
          </fieldset>

          <fieldset className="auth-mode">
            <legend className="sr-only">Connection mode</legend>
            <div className="auth-mode-copy">
              <strong>Connection</strong>
              <span>
                {mode === 'demo'
                  ? 'Demo data stays in this browser.'
                  : 'Live sign-in is active. Workout data in this prototype stays in this browser.'}
              </span>
              {!isLiveAvailable ? (
                <small id={`${fieldId}-live-help`}>
                  Live sign-in needs Supabase configuration.
                </small>
              ) : null}
            </div>
            <div className="auth-mode-options">
              <button
                type="button"
                aria-pressed={mode === 'demo'}
                className={mode === 'demo' ? 'is-active' : ''}
                disabled={submitting}
                onClick={() => setMode('demo')}
              >
                Demo
              </button>
              <button
                type="button"
                aria-pressed={mode === 'live'}
                className={mode === 'live' ? 'is-active' : ''}
                disabled={!isLiveAvailable || submitting}
                aria-describedby={isLiveAvailable ? undefined : `${fieldId}-live-help`}
                onClick={() => setMode('live')}
              >
                Live
              </button>
            </div>
          </fieldset>

          <form className="auth-form" noValidate onSubmit={handleSubmit}>
            {Object.keys(errors).length > 0 ? (
              <p className="auth-message" role="alert">
                Check the highlighted {Object.keys(errors).length === 1 ? 'field' : 'fields'}.
              </p>
            ) : null}
            {view === 'sign-up' ? (
              <div className="onboarding-field">
                <label htmlFor={`${fieldId}-name`}>Name</label>
                <span className="onboarding-field-control">
                  <UserRound size={19} aria-hidden="true" />
                  <input
                    id={`${fieldId}-name`}
                    name="name"
                    type="text"
                    required
                    minLength={2}
                    autoComplete="name"
                    value={displayName}
                    aria-invalid={errors.displayName !== undefined}
                    aria-describedby={`${fieldId}-name-help${
                      errors.displayName === undefined ? '' : ` ${fieldId}-name-error`
                    }`}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="How should we address you?"
                  />
                </span>
                <small id={`${fieldId}-name-help`}>Use at least 2 characters.</small>
                {errors.displayName !== undefined ? (
                  <small id={`${fieldId}-name-error`} className="field-error">
                    {errors.displayName}
                  </small>
                ) : null}
              </div>
            ) : null}

            <div className="onboarding-field">
              <label htmlFor={`${fieldId}-email`}>Email</label>
              <span className="onboarding-field-control">
                <Mail size={19} aria-hidden="true" />
                <input
                  id={`${fieldId}-email`}
                  name="email"
                  type="email"
                  required
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  aria-invalid={errors.email !== undefined}
                  aria-describedby={
                    errors.email === undefined ? undefined : `${fieldId}-email-error`
                  }
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </span>
              {errors.email !== undefined ? (
                <small id={`${fieldId}-email-error`} className="field-error">
                  {errors.email}
                </small>
              ) : null}
            </div>

            <div className="onboarding-field">
              <label htmlFor={`${fieldId}-password`}>Password</label>
              <span className="onboarding-field-control onboarding-password-control">
                <LockKeyhole size={19} aria-hidden="true" />
                <input
                  id={`${fieldId}-password`}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete={view === 'sign-in' ? 'current-password' : 'new-password'}
                  value={password}
                  aria-invalid={errors.password !== undefined}
                  aria-describedby={`${fieldId}-password-help${
                    errors.password === undefined ? '' : ` ${fieldId}-password-error`
                  }`}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  className="password-visibility"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
              <small id={`${fieldId}-password-help`}>Use at least 8 characters.</small>
              {errors.password !== undefined ? (
                <small id={`${fieldId}-password-error`} className="field-error">
                  {errors.password}
                </small>
              ) : null}
            </div>

            {message !== null ? (
              <p className="auth-message" role="alert">
                {message}
              </p>
            ) : null}

            <Button
              className="auth-submit"
              type="submit"
              loading={submitting}
              aria-busy={submitting}
            >
              {view === 'sign-in' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="auth-switch">
            {view === 'sign-in' ? 'New to AdaptFit?' : 'Already have an account?'}{' '}
            <button
              type="button"
              disabled={submitting}
              onClick={() => selectView(view === 'sign-in' ? 'sign-up' : 'sign-in')}
            >
              {view === 'sign-in' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
};

export const ProfileSummaryScreen = () => {
  const { authenticated, mode, user, saveUser, signOut } = useApp();
  const navigate = useNavigate();
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const profileNameRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const savedStatusRef = useRef<HTMLParagraphElement>(null);

  const beginEditing = () => {
    setDisplayName(user.displayName);
    setEmail(user.email);
    setErrors({});
    setSaved(false);
    setSaveError(null);
    setEditing(true);
    window.setTimeout(() => profileNameRef.current?.focus(), 0);
  };

  const cancelEditing = () => {
    setDisplayName(user.displayName);
    setEmail(user.email);
    setErrors({});
    setSaveError(null);
    setEditing(false);
    window.setTimeout(() => editButtonRef.current?.focus(), 0);
  };

  const saveProfile = async () => {
    const nextErrors: FieldErrors = {};
    if (displayName.trim().length < 2) {
      nextErrors.displayName = 'Enter the name you would like us to use.';
    }
    if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidId =
        nextErrors.displayName !== undefined
          ? `${fieldId}-profile-name`
          : `${fieldId}-profile-email`;
      window.setTimeout(() => document.getElementById(firstInvalidId)?.focus(), 0);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveUser({ displayName: displayName.trim(), email: email.trim() });
      if (!result.ok) {
        setSaveError(result.message);
        return;
      }
      setEditing(false);
      setSaved(true);
      window.setTimeout(() => savedStatusRef.current?.focus(), 0);
    } catch {
      setSaveError('Your profile could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="onboarding-shell profile-screen">
      <StatusBar />
      <div className="profile-layout">
        <Link className="profile-brand" to="/dashboard" aria-label="Go to AdaptFit dashboard">
          <BrandMark />
        </Link>

        <header className="profile-heading">
          <p className="eyebrow">Almost ready</p>
          <h1>Profile Summary</h1>
          <p>Review your account information.</p>
        </header>

        <section className="profile-card" aria-label="Account profile">
          <div className="profile-avatar" aria-hidden="true">
            <UserRound size={72} strokeWidth={1.25} />
            <span />
          </div>

          {editing ? (
            <form
              className="profile-edit-fields"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void saveProfile();
              }}
            >
              {Object.keys(errors).length > 0 ? (
                <p className="auth-message" role="alert">
                  Check the highlighted {Object.keys(errors).length === 1 ? 'field' : 'fields'}.
                </p>
              ) : null}
              <div className="onboarding-field">
                <label htmlFor={`${fieldId}-profile-name`}>Name</label>
                <span className="onboarding-field-control">
                  <UserRound size={19} aria-hidden="true" />
                  <input
                    ref={profileNameRef}
                    id={`${fieldId}-profile-name`}
                    type="text"
                    required
                    minLength={2}
                    autoComplete="name"
                    value={displayName}
                    aria-invalid={errors.displayName !== undefined}
                    aria-describedby={`${fieldId}-profile-name-help${
                      errors.displayName === undefined ? '' : ` ${fieldId}-profile-name-error`
                    }`}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </span>
                <small id={`${fieldId}-profile-name-help`}>Use at least 2 characters.</small>
                {errors.displayName !== undefined ? (
                  <small id={`${fieldId}-profile-name-error`} className="field-error">
                    {errors.displayName}
                  </small>
                ) : null}
              </div>
              <div className="onboarding-field">
                <label htmlFor={`${fieldId}-profile-email`}>Email</label>
                <span className="onboarding-field-control">
                  <Mail size={19} aria-hidden="true" />
                  <input
                    id={`${fieldId}-profile-email`}
                    type="email"
                    required
                    readOnly={mode === 'live'}
                    autoComplete="email"
                    value={email}
                    aria-invalid={errors.email !== undefined}
                    aria-describedby={
                      [
                        mode === 'live' ? `${fieldId}-profile-email-help` : undefined,
                        errors.email === undefined ? undefined : `${fieldId}-profile-email-error`,
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </span>
                {errors.email !== undefined ? (
                  <small id={`${fieldId}-profile-email-error`} className="field-error">
                    {errors.email}
                  </small>
                ) : null}
                {mode === 'live' ? (
                  <small id={`${fieldId}-profile-email-help`}>
                    Account email changes are managed through your sign-in provider.
                  </small>
                ) : null}
              </div>
              <div className="profile-edit-actions">
                <Button type="button" variant="tertiary" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving} aria-busy={saving}>
                  Save Changes
                </Button>
              </div>
              {saveError !== null ? (
                <p className="auth-message" role="alert">
                  {saveError}
                </p>
              ) : null}
            </form>
          ) : (
            <div className="profile-readonly">
              <h2 id="profile-name">{user.displayName}</h2>
              <p>{user.email}</p>
              <button
                ref={editButtonRef}
                type="button"
                className="profile-edit-button"
                onClick={beginEditing}
              >
                <Pencil size={20} aria-hidden="true" />
                Edit Profile
              </button>
            </div>
          )}
        </section>

        {saved ? (
          <p ref={savedStatusRef} className="profile-saved" role="status" tabIndex={-1}>
            <CheckCircle2 size={18} aria-hidden="true" />
            Your profile has been saved.
          </p>
        ) : null}

        <Button
          className="profile-done"
          type="button"
          disabled={editing}
          onClick={() => navigate('/dashboard')}
        >
          Done
        </Button>
        {authenticated ? (
          <Button
            className="profile-done"
            type="button"
            variant="tertiary"
            loading={signingOut}
            aria-busy={signingOut}
            onClick={() => {
              setSigningOut(true);
              setSignOutError(null);
              void signOut()
                .then(() => navigate('/sign-in'))
                .catch(() =>
                  setSignOutError('Sign out failed. Check your connection and try again.'),
                )
                .finally(() => setSigningOut(false));
            }}
          >
            Sign Out
          </Button>
        ) : null}
        {signOutError !== null ? (
          <p className="auth-message" role="alert">
            {signOutError}
          </p>
        ) : null}
      </div>
    </main>
  );
};
