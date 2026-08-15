import { bodyRegions, regionStatusLabels, regionStatusOrder } from '../data/profileOptions';
import type { BodySide, RegionStatus } from '../types';

/**
 * The silhouette behind the region markers. Drawn once per side rather than imported as
 * artwork so it inherits the theme's stroke colour and stays crisp at any size.
 */
const SilhouettePaths = ({ side }: { side: BodySide }) => (
  <g className="body-figure__outline">
    <ellipse cx="50" cy="8.5" rx="6.2" ry="7.2" />
    <rect x="47.2" y="13.5" width="5.6" height="5" rx="2.4" />
    <rect x="35" y="18" width="30" height="26" rx="8.5" />
    <rect x="37.5" y="39" width="25" height="15" rx="5.5" />
    <rect x="38" y="50" width="24" height="11" rx="5" />
    <rect x="27.4" y="20.5" width="7" height="23" rx="3.5" />
    <rect x="65.6" y="20.5" width="7" height="23" rx="3.5" />
    <rect x="26.2" y="40" width="6.4" height="19" rx="3.2" />
    <rect x="67.4" y="40" width="6.4" height="19" rx="3.2" />
    <rect x="40" y="57" width="9" height="24" rx="4.5" />
    <rect x="51" y="57" width="9" height="24" rx="4.5" />
    <rect x="40.8" y="77" width="7.6" height="20" rx="3.8" />
    <rect x="51.6" y="77" width="7.6" height="20" rx="3.8" />
    {side === 'back' ? (
      <line x1="50" y1="20" x2="50" y2="52" className="body-figure__spine" />
    ) : null}
  </g>
);

export type BodyDiagramProps = {
  side: BodySide;
  regions: Record<string, RegionStatus>;
  /** Omit to render a read-only diagram with no interactive controls. */
  onSelectRegion?: (regionId: string) => void;
  activeRegionId?: string | null;
};

export const BodyDiagram = ({
  side,
  regions,
  onSelectRegion,
  activeRegionId = null,
}: BodyDiagramProps) => {
  const sideRegions = bodyRegions.filter((region) => region.side === side);
  const interactive = onSelectRegion !== undefined;

  return (
    <div className={`body-figure ${interactive ? 'body-figure--interactive' : ''}`}>
      <svg viewBox="0 0 100 100" className="body-figure__svg" aria-hidden="true">
        <SilhouettePaths side={side} />
      </svg>
      {sideRegions.map((region) => {
        const status = regions[region.id] ?? 'none';
        const label = `${region.label}: ${regionStatusLabels[status]}`;
        const positioning = { left: `${region.x}%`, top: `${region.y}%` };

        if (!interactive) {
          return (
            <span
              key={region.id}
              className={`body-marker body-marker--${status}`}
              style={positioning}
              title={label}
            >
              <span className="sr-only">{label}</span>
            </span>
          );
        }

        return (
          <button
            key={region.id}
            type="button"
            className={`body-marker body-marker--${status} ${
              activeRegionId === region.id ? 'is-active' : ''
            }`}
            style={positioning}
            onClick={() => onSelectRegion(region.id)}
            aria-pressed={status !== 'none'}
          >
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const RegionLegend = () => (
  <ul className="region-legend">
    {regionStatusOrder.map((status) => (
      <li key={status}>
        <span className={`body-marker body-marker--${status}`} aria-hidden="true" />
        {regionStatusLabels[status]}
      </li>
    ))}
  </ul>
);
