import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AppProvider } from './state/AppContext';

const storageKey = 'adaptfit-web-demo-state-v1';

const renderApp = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  );

const getStoredState = () =>
  JSON.parse(localStorage.getItem(storageKey) ?? '{}') as {
    authenticated?: boolean;
    user?: { displayName: string; email: string };
    profile?: { focusRegions: string[]; avoidRegions: string[] };
    history?: Array<{ title: string; completedReps: number }>;
  };

describe('AdaptFit application flows', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('moves from the welcome screen through demo sign-in to the dashboard', async () => {
    renderApp('/welcome');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Smarter workouts. Real results.' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Live' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'safe-pass-123' },
    });

    const form = screen.getByLabelText('Email').closest('form');
    expect(form).not.toBeNull();
    fireEvent.click(within(form as HTMLFormElement).getByRole('button', { name: 'Sign In' }));

    // Signing in lands on Home, which greets the user by first name.
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Jordan' })).toBeInTheDocument(),
    );
    expect(getStoredState()).toMatchObject({
      authenticated: true,
      user: { displayName: 'Jordan Lee', email: 'alex@example.com' },
    });
  });

  it('updates movement preferences and navigates through discovery and the catalog', async () => {
    renderApp('/discover');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Exercise Discovery' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Avoid\s*Limit use/i }));
    fireEvent.click(screen.getByRole('button', { name: /Arms\s*Select/i }));

    expect(screen.getByRole('button', { name: /Arms\s*Avoid/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await waitFor(() => expect(getStoredState().profile?.avoidRegions).toContain('Arms'));

    fireEvent.click(screen.getByRole('link', { name: /View all exercises/i }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Exercise Selection' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search for an exercise' }), {
      target: { value: 'Seated Bicep Curl' },
    });

    expect(screen.getByText('1 available')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View Seated Bicep Curl' }));

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Seated Bicep Curl:\s*Exercise Card/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Seated Bicep Curl' }),
    ).toBeInTheDocument();
  });

  it('saves profile edits and restores them in a new provider instance', async () => {
    const firstRender = renderApp('/profile/summary');

    expect(screen.getByRole('heading', { level: 2, name: 'Jordan Lee' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Sam Rivera' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'sam.rivera@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Your profile has been saved.'),
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Sam Rivera' })).toBeInTheDocument();
    await waitFor(() =>
      expect(getStoredState().user).toEqual({
        displayName: 'Sam Rivera',
        email: 'sam.rivera@example.com',
      }),
    );

    firstRender.unmount();
    renderApp('/profile/summary');

    expect(screen.getByRole('heading', { level: 2, name: 'Sam Rivera' })).toBeInTheDocument();
    expect(screen.getByText('sam.rivera@example.com')).toBeInTheDocument();
  });

  it('runs a camera-optional workout through loading, pause, resume, and completion', () => {
    vi.useFakeTimers();
    renderApp('/camera/permission');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Camera Permission' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Not Now' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Building your workout' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Building workout' })).toHaveAttribute(
      'aria-valuenow',
      '4',
    );

    act(() => vi.advanceTimersByTime(2_800));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Seated Bicep Curl' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log rep' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Log rep' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log rep' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Paused' })).toBeInTheDocument();
    expect(screen.getByText('2 / 10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Seated Bicep Curl' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish early' }));
    expect(
      screen.getByRole('alertdialog', { name: 'Finish this exercise early?' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finish exercise' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Exercise completed' }),
    ).toBeInTheDocument();
    expect(getStoredState().history?.[0]).toMatchObject({
      title: 'Seated Bicep Curl',
      completedReps: 2,
    });
  });
});
