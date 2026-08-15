import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AppProvider } from './state/AppContext';

const BackControl = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Test browser back
    </button>
  );
};

const renderApp = (initialEntry: string, withBackControl = false) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProvider>
        {withBackControl ? <BackControl /> : null}
        <App />
      </AppProvider>
    </MemoryRouter>,
  );

const createCamera = () => {
  const track = new EventTarget() as MediaStreamTrack;
  const stop = vi.fn();
  Object.defineProperties(track, {
    readyState: { configurable: true, value: 'live' },
    stop: { configurable: true, value: stop },
  });
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, stop, track };
};

const installCameraMock = (...streams: MediaStream[]) => {
  const getUserMedia = vi.fn();
  for (const stream of streams) getUserMedia.mockResolvedValueOnce(stream);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  return getUserMedia;
};

describe('camera route safety', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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
    Reflect.deleteProperty(navigator, 'mediaDevices');
  });

  it('redirects direct camera setup access without requesting a camera', async () => {
    const getUserMedia = installCameraMock();

    renderApp('/camera/setup');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Camera Permission' }),
    ).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('offers a retry when an approved camera track ends', async () => {
    vi.useFakeTimers();
    const firstCamera = createCamera();
    const secondCamera = createCamera();
    const getUserMedia = installCameraMock(firstCamera.stream, secondCamera.stream);
    renderApp('/camera/permission');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Allow Camera Access' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Camera Setup' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole('button', { name: 'Begin Exercise' })).toBeEnabled();

    act(() => firstCamera.track.dispatchEvent(new Event('ended')));

    expect(screen.getByRole('alert')).toHaveTextContent('The camera connection ended');
    expect(screen.getByRole('button', { name: 'Try Camera Again' })).toBeEnabled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try Camera Again' }));
      await Promise.resolve();
    });
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Try Camera Again' })).not.toBeInTheDocument();
  });

  it('keeps an active session running when browser Back reaches camera history', async () => {
    vi.useFakeTimers();
    const camera = createCamera();
    const getUserMedia = installCameraMock(camera.stream);
    renderApp('/camera/permission', true);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Allow Camera Access' }));
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole('button', { name: 'Begin Exercise' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Building your workout' }),
    ).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2_800));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Seated Bicep Curl' }),
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText('00:01')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Test browser back' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Seated Bicep Curl' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Camera Setup' }),
    ).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText('00:02')).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('blocks direct error URLs but admits an actual workout-build failure', () => {
    const directRender = renderApp('/session/error');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Exercise Selection' }),
    ).toBeInTheDocument();
    directRender.unmount();

    vi.useFakeTimers();
    sessionStorage.setItem('adaptfit-force-load-error', 'true');
    renderApp('/camera/permission');
    fireEvent.click(screen.getByRole('button', { name: 'Not Now' }));
    act(() => vi.advanceTimersByTime(2_800));

    expect(
      screen.getByRole('heading', { level: 1, name: 'We couldn’t load this exercise' }),
    ).toBeInTheDocument();
  });
});
