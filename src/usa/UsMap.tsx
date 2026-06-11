/**
 * UsMap component - Renders the interactive US county map with colors
 * 
 * Uses d3.geoAlbersUsa() projection for display. The actual centroid calculations
 * are done on unprojected lon/lat coordinates in the map.ts module.
 */

import { useMemo, useState, useCallback, memo } from 'react';
import { geoPath, geoAlbersUsa } from 'd3-geo';
import type { CountyFeature } from './map';
import type { StateResult } from './sun';
import { colorForDelta } from './colors';

interface UsMapProps {
  features: CountyFeature[];
  sunsetData: {
    maxAbsDelta: number;
    perState: Record<string, StateResult>;
  } | null;
}

interface TooltipData {
  name: string;
  stateName: string;
  sunsetHHMM: string | null;
  delta: number | null;
  tzid: string | null;
  x: number;
  y: number;
}

// Map dimensions
const WIDTH = 960;
const HEIGHT = 600;

// Memoized path component to prevent re-renders
const MapPath = memo(function MapPath({
  path,
  color,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onClick,
}: {
  path: string;
  color: string;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <path
      d={path}
      fill={color}
      stroke="#333"
      strokeWidth={0.15}
      className="map-path"
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
});

export function UsMap({ features, sunsetData }: UsMapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [pinnedTooltip, setPinnedTooltip] = useState<TooltipData | null>(null);

  // Create projection for display
  const projection = useMemo(() => {
    return geoAlbersUsa()
      .scale(1200)
      .translate([WIDTH / 2, HEIGHT / 2]);
  }, []);

  // Create path generator
  const pathGenerator = useMemo(() => {
    return geoPath(projection);
  }, [projection]);

  // Compute paths and colors for each feature (memoized)
  const featuresWithPaths = useMemo(() => {
    return features.map((feat) => {
      const path = pathGenerator(feat.feature);
      const result = sunsetData?.perState[feat.id] || null;
      const color = colorForDelta(
        result?.delta ?? null,
        sunsetData?.maxAbsDelta ?? 0
      );

      return {
        ...feat,
        path,
        color,
        result,
      };
    });
  }, [features, sunsetData, pathGenerator]);

  // Handle mouse events
  const handleMouseEnter = useCallback(
    (feat: (typeof featuresWithPaths)[0], e: React.MouseEvent) => {
      if (pinnedTooltip) return;

      setTooltip({
        name: feat.name,
        stateName: feat.stateName,
        sunsetHHMM: feat.result?.sunsetHHMM ?? null,
        delta: feat.result?.delta ?? null,
        tzid: feat.result?.tzid ?? null,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [pinnedTooltip]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (tooltip && !pinnedTooltip) {
        setTooltip((prev) =>
          prev ? { ...prev, x: e.clientX, y: e.clientY } : null
        );
      }
    },
    [tooltip, pinnedTooltip]
  );

  const handleMouseLeave = useCallback(() => {
    if (!pinnedTooltip) {
      setTooltip(null);
    }
  }, [pinnedTooltip]);

  const handleClick = useCallback(
    (feat: (typeof featuresWithPaths)[0], e: React.MouseEvent) => {
      if (pinnedTooltip && pinnedTooltip.name === feat.name) {
        setPinnedTooltip(null);
        setTooltip(null);
      } else {
        setPinnedTooltip({
          name: feat.name,
          stateName: feat.stateName,
          sunsetHHMM: feat.result?.sunsetHHMM ?? null,
          delta: feat.result?.delta ?? null,
          tzid: feat.result?.tzid ?? null,
          x: e.clientX,
          y: e.clientY,
        });
        setTooltip(null);
      }
    },
    [pinnedTooltip]
  );

  // Close pinned tooltip when clicking outside
  const handleSvgClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && pinnedTooltip) {
        setPinnedTooltip(null);
      }
    },
    [pinnedTooltip]
  );

  // Format delta for display
  const formatDelta = (delta: number | null) => {
    if (delta === null) return 'N/A';
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${Math.round(delta)} min`;
  };

  const activeTooltip = pinnedTooltip || tooltip;

  return (
    <div className="map-container">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="us-map"
        onClick={handleSvgClick}
      >
        <g className="features">
          {featuresWithPaths.map((feat) => (
            feat.path && (
              <MapPath
                key={feat.id}
                path={feat.path}
                color={feat.color}
                onMouseEnter={(e) => handleMouseEnter(feat, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick(feat, e);
                }}
              />
            )
          ))}
        </g>
      </svg>

      {activeTooltip && (
        <div
          className={`tooltip ${pinnedTooltip ? 'pinned' : ''}`}
          style={{
            left: activeTooltip.x + 10,
            top: activeTooltip.y + 10,
          }}
        >
          <div className="tooltip-name">
            {activeTooltip.name}, {activeTooltip.stateName}
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Sunset:</span>
            <span className="tooltip-value">
              {activeTooltip.sunsetHHMM || 'N/A'}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">vs Avg:</span>
            <span
              className={`tooltip-value ${
                activeTooltip.delta !== null
                  ? activeTooltip.delta > 0
                    ? 'later'
                    : 'earlier'
                  : ''
              }`}
            >
              {formatDelta(activeTooltip.delta)}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Zone:</span>
            <span className="tooltip-value tooltip-tz">
              {activeTooltip.tzid || 'N/A'}
            </span>
          </div>
          {pinnedTooltip && (
            <div className="tooltip-hint">Click to unpin</div>
          )}
        </div>
      )}
    </div>
  );
}
