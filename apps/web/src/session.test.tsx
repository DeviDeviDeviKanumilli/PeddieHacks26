import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AppProvider } from './state/AppContext';

const demoStorageKey = 'adaptfit-web-demo-state-v1';

const renderApp = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  );

const getStoredHistoryCount = () => {
  const stored = JSON.parse(localStorage.getItem(demoStorageKey) ?? '{}') as {
    history?: unknown[];
  };
  return stored.history?.length ?? 0;
};

const startManualSession = () => {
  renderApp('/camera/permission');
  fireEvent.click(screen.getByRole('button', { name: 'Not Now' }));
  act(() => vi.advanceTimersByTime(2_800));

  expect(screen.getByRole('heading', { level: 1, name: 'Seated Bicep Curl' })).toBeInTheDocument();
};

const completeFirstSet = () => {
  for (let rep = 0; rep < 10; rep += 1) {
    fireEvent.click(screen.getByRole('button', { name: 'Log rep' }));
  }
  act(() => vi.advanceTimersByTime(500));
  expect(screen.getByRole('heading', { level: 1, name: 'Rest' })).toBeInTheDocument();
};

describe('session safety and rest accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
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

  it('opens the early-finish alert and lets the user keep exercising without recording', () => {
    startManualSession();
    const initialHistoryCount = getStoredHistoryCount();

    fireEvent.click(screen.getByRole('button', { name: 'Finish early' }));

    expect(
      screen.getByRole('alertdialog', { name: 'Finish this exercise early?' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No reps have been logged/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Keep exercising' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Seated Bicep Curl' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish early' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(getStoredHistoryCount()).toBe(initialHistoryCount);
  });

  it('ends a zero-rep session without adding it to workout history', () => {
    startManualSession();
    const initialHistoryCount = getStoredHistoryCount();

    fireEvent.click(screen.getByRole('button', { name: 'Finish early' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish exercise' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Session ended' })).toBeInTheDocument();
    expect(
      screen.getByText('No reps were logged, so this session was not added to your progress.'),
    ).toBeInTheDocument();
    expect(getStoredHistoryCount()).toBe(initialHistoryCount);
  });

  it('exposes named set progress with a meaningful value during rest', () => {
    startManualSession();
    completeFirstSet();

    const progress = screen.getByRole('progressbar', {
      name: 'Workout progress, sets completed',
    });
    expect(progress).toHaveAttribute('value', '33');
    expect(progress).toHaveAttribute('aria-valuetext', 'Set 1 of 3 completed');
    expect(screen.getByText('Set 1 of 3 completed')).toBeInTheDocument();
  });

  it('announces each fifteen-second rest extension politely', () => {
    startManualSession();
    completeFirstSet();

    fireEvent.click(screen.getByRole('button', { name: 'Add 15 seconds of rest' }));

    expect(screen.getByRole('timer', { name: '60 seconds remaining' })).toBeInTheDocument();
    const announcement = screen.getByText(/Added 15 seconds of rest/);
    expect(announcement).toHaveTextContent('Additions this break: 1');
    expect(announcement).toHaveAttribute('aria-live', 'polite');
    expect(announcement).toHaveAttribute('aria-atomic', 'true');
  });
});
