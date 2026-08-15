import { Check, PersonStanding } from 'lucide-react';
import { useEffect, useRef } from 'react';

export const ProgressRing = ({
  value,
  label,
  size = 150,
}: {
  value: number;
  label?: string;
  size?: number;
}) => {
  const safeValue = Math.max(0, Math.min(100, value));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <circle className="progress-ring__track" cx="55" cy="55" r={radius} />
        <circle
          className="progress-ring__value"
          cx="55"
          cy="55"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safeValue / 100)}
        />
      </svg>
      <div className="progress-ring__copy">
        <strong>{safeValue}%</strong>
        {label !== undefined ? <span>{label}</span> : null}
      </div>
    </div>
  );
};

export const PoseOverlay = ({ variant = 'standing' }: { variant?: 'standing' | 'seated' }) => (
  <svg className="pose-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <g className="pose-overlay__frame">
      <path d="M8 18V8h10M82 8h10v10M8 82v10h10M92 82v10H82" />
    </g>
    {variant === 'standing' ? (
      <g className="pose-overlay__skeleton">
        <path d="M50 18 50 34 35 39 29 58 35 39 65 39 71 58M50 34 50 63 41 68 37 91M50 63 59 68 63 91" />
        {[
          ['50', '18'],
          ['50', '34'],
          ['35', '39'],
          ['65', '39'],
          ['29', '58'],
          ['71', '58'],
          ['50', '63'],
          ['41', '68'],
          ['59', '68'],
          ['37', '91'],
          ['63', '91'],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" />
        ))}
      </g>
    ) : (
      <g className="pose-overlay__skeleton">
        <path d="M50 17 49 34 37 39 32 57 37 39 62 40 70 53M49 34 49 64 36 69 52 74 36 69 28 88M49 64 66 69 75 88" />
        {[
          ['50', '17'],
          ['49', '34'],
          ['37', '39'],
          ['62', '40'],
          ['32', '57'],
          ['70', '53'],
          ['49', '64'],
          ['36', '69'],
          ['66', '69'],
          ['28', '88'],
          ['75', '88'],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" />
        ))}
      </g>
    )}
  </svg>
);

export const CameraPreview = ({
  stream,
  variant = 'standing',
  paused = false,
  className = '',
}: {
  stream: MediaStream | null;
  variant?: 'standing' | 'seated';
  paused?: boolean;
  className?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current !== null) videoRef.current.srcObject = stream;
  }, [stream]);
  const fallback =
    variant === 'standing' ? '/assets/camera-setup.png' : '/assets/seated-bicep-curl.png';
  return (
    <div className={`camera-preview ${className}`}>
      {stream !== null ? (
        <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" />
      ) : (
        <img
          src={fallback}
          alt={
            variant === 'standing'
              ? 'Person standing ready for camera setup'
              : 'Person demonstrating a seated bicep curl'
          }
        />
      )}
      <PoseOverlay variant={variant} />
      {paused ? (
        <span className="camera-preview__paused" aria-hidden="true">
          Ⅱ
        </span>
      ) : null}
    </div>
  );
};

const zonePositions: Record<string, { left: string; top: string }> = {
  Shoulders: { left: '72%', top: '19%' },
  Arms: { left: '12%', top: '34%' },
  Core: { left: '73%', top: '39%' },
  Back: { left: '12%', top: '48%' },
  'Lower Back': { left: '73%', top: '51%' },
  Hips: { left: '12%', top: '60%' },
  'Left Knee': { left: '70%', top: '70%' },
  'Right Knee': { left: '10%', top: '70%' },
  'Lower Body': { left: '67%', top: '84%' },
};

export const BodyMap = ({
  regions,
  focus,
  avoid,
  onSelect,
}: {
  regions: string[];
  focus: string[];
  avoid: string[];
  onSelect: (region: string) => void;
}) => (
  <div className="body-map">
    <svg viewBox="0 0 180 360" aria-hidden="true">
      <circle cx="90" cy="36" r="22" />
      <path d="M64 68Q90 54 116 68L124 145 111 208 105 322H78L70 208 56 145Z" />
      <path d="m60 77-25 75 14 7 31-69M120 77l25 75-14 7-31-69" />
      <path d="m78 202-17 117 18 4 12-106M104 202l16 117-18 4-12-106" />
    </svg>
    {regions.map((region) => {
      const state = focus.includes(region) ? 'focus' : avoid.includes(region) ? 'avoid' : 'neutral';
      return (
        <button
          key={region}
          type="button"
          className={`body-map__zone body-map__zone--${state}`}
          style={zonePositions[region]}
          aria-pressed={state !== 'neutral'}
          onClick={() => onSelect(region)}
        >
          <span>{region}</span>
          <small>{state === 'neutral' ? 'Select' : state === 'focus' ? 'Focus' : 'Avoid'}</small>
        </button>
      );
    })}
  </div>
);

export const ExerciseArt = ({ slug, size = 84 }: { slug: string; size?: number }) => {
  const seated = slug.includes('seated') || slug.includes('chair');
  const band = slug.includes('band');
  const bridge = slug.includes('bridge');
  return (
    <span className="exercise-art" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <title>Decorative exercise illustration</title>
        {bridge ? (
          <path d="M14 70h72M22 68q15-4 24-23l19 2 14 20M21 67l-8-2M46 45l-6-16" />
        ) : (
          <>
            <circle cx="49" cy="19" r="8" />
            <path
              d={
                seated
                  ? 'M49 27v28l19 12M49 38 31 47M49 38l18 7M49 55H29v31M29 57h-9v29M68 67v20'
                  : 'M49 27v30m0-18-19 12m19-12 20 11M49 57 34 87m15-30 17 30'
              }
            />
            {band ? <path d="M30 50q20 12 40 0" /> : null}
          </>
        )}
      </svg>
    </span>
  );
};

export const MuscleMap = ({ compact = false }: { compact?: boolean }) => (
  <div
    className={`muscle-map ${compact ? 'muscle-map--compact' : ''}`}
    role="img"
    aria-label="Front and back muscle coverage illustration"
  >
    {['Front', 'Back'].map((label) => (
      <div key={label}>
        <svg viewBox="0 0 90 180" aria-hidden="true">
          <circle cx="45" cy="18" r="12" />
          <path
            className="muscle-map__body"
            d="M30 35Q45 28 60 35L67 91 57 113 57 170H45L40 113 34 170H22L28 111 21 91Z"
          />
          <path
            className="muscle-map__hit muscle-map__hit--high"
            d={
              label === 'Front'
                ? 'M31 38 44 34 44 67 29 64ZM59 38 46 34 46 67 61 64ZM34 72h22l-2 23H36Z'
                : 'M31 38h28l3 24-17 16-17-16Z'
            }
          />
          <path
            className="muscle-map__hit"
            d="m23 42-12 42 10 4 13-39M66 43l12 41-10 4-13-39M29 113l-7 49h12l8-48M54 114l4 48h12l-8-49"
          />
        </svg>
        <span>{label}</span>
      </div>
    ))}
  </div>
);

export const ActivityGrid = ({ count = 84 }: { count?: number }) => {
  const cells = Array.from({ length: count }, (_, index) => ({
    id: `activity-day-${index + 1}`,
    level: ((index * 7 + Math.floor(index / 5)) % 5) as 0 | 1 | 2 | 3 | 4,
  }));
  const activeDays = cells.filter(({ level }) => level > 0).length;
  const highActivityDays = cells.filter(({ level }) => level >= 3).length;
  return (
    <div
      className="activity-grid"
      role="img"
      aria-label={`Representative activity pattern: ${activeDays} active days out of ${count}, including ${highActivityDays} higher-activity days.`}
    >
      {cells.map(({ id, level }) => (
        <span
          key={id}
          className={`activity-grid__cell activity-grid__cell--${level}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

export const RepBarChart = ({
  values = [
    87, 88, 86, 89, 90, 84, 88, 81, 90, 74, 89, 88, 91, 86, 79, 88, 90, 76, 91, 85, 88, 90, 89, 87,
    92, 89, 88, 91, 90, 89,
  ],
}: {
  values?: number[];
}) => {
  const minimum = values.length === 0 ? 0 : Math.min(...values);
  const maximum = values.length === 0 ? 0 : Math.max(...values);
  const average =
    values.length === 0
      ? 0
      : Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  const bars = values.map((value, index) => ({ id: `rep-${index + 1}`, value }));
  return (
    <div
      className="rep-chart"
      role="img"
      aria-label={`${values.length} repetitions. Range average ${average}%, minimum ${minimum}%, maximum ${maximum}%.`}
    >
      <span className="rep-chart__target">Target</span>
      <div className="rep-chart__bars" aria-hidden="true">
        {bars.map(({ id, value }) => (
          <span key={id} style={{ height: `${value}%` }} />
        ))}
      </div>
    </div>
  );
};

export const ReadyRow = ({
  label,
  ready,
  pending = false,
}: {
  label: string;
  ready: boolean;
  pending?: boolean;
}) => (
  <div className="ready-row">
    <span className={`ready-row__state ${ready ? 'is-ready' : ''}`} aria-hidden="true">
      {ready ? <Check size={18} /> : pending ? '•••' : <PersonStanding size={18} />}
    </span>
    <span>{label}</span>
    <span className="sr-only">{ready ? 'Ready' : pending ? 'Checking' : 'Not ready'}</span>
    <span className={`ready-row__dot ${ready ? 'is-ready' : ''}`} aria-hidden="true" />
  </div>
);
