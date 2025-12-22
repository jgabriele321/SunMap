/**
 * UsMap component - Renders the interactive US map with state colors
 * 
 * Uses d3.geoAlbersUsa() projection for display, which properly handles
 * Alaska and Hawaii by repositioning them. The actual centroid calculations
 * are done on unprojected lon/lat coordinates in the map.ts module.
 */

import { useMemo, useState, useCallback } from 'react';
import { geoPath, geoAlbersUsa } from 'd3-geo';
import type { StateFeature } from '../lib/map';
import type { StateResult } from '../lib/sun';
import { colorForDelta } from '../lib/colors';

interface UsMapProps {
  stateFeatures: StateFeature[];
  sunsetData: {
    maxAbsDelta: number;
    perState: Record<string, StateResult>;
  } | null;
}

interface TooltipData {
  name: string;
  sunsetHHMM: string | null;
  delta: number | null;
  tzid: string | null;
  x: number;
  y: number;
}

// Map dimensions
const WIDTH = 960;
const HEIGHT = 600;

export function UsMap({ stateFeatures, sunsetData }: UsMapProps) {
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

  // Compute paths and colors for each state
  const statesWithPaths = useMemo(() => {
    return stateFeatures.map((state) => {
      const path = pathGenerator(state.feature);
      const stateResult = sunsetData?.perState[state.id] || null;
      const color = colorForDelta(
        stateResult?.delta ?? null,
        sunsetData?.maxAbsDelta ?? 0
      );

      return {
        ...state,
        path,
        color,
        stateResult,
      };
    });
  }, [stateFeatures, sunsetData, pathGenerator]);

  // Handle mouse events
  const handleMouseEnter = useCallback(
    (state: (typeof statesWithPaths)[0], e: React.MouseEvent) => {
      if (pinnedTooltip) return; // Don't show hover tooltip if one is pinned

      setTooltip({
        name: state.name,
        sunsetHHMM: state.stateResult?.sunsetHHMM ?? null,
        delta: state.stateResult?.delta ?? null,
        tzid: state.stateResult?.tzid ?? null,
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
    (state: (typeof statesWithPaths)[0], e: React.MouseEvent) => {
      // Toggle pinned tooltip
      if (
        pinnedTooltip &&
        pinnedTooltip.name === state.name
      ) {
        setPinnedTooltip(null);
        setTooltip(null);
      } else {
        setPinnedTooltip({
          name: state.name,
          sunsetHHMM: state.stateResult?.sunsetHHMM ?? null,
          delta: state.stateResult?.delta ?? null,
          tzid: state.stateResult?.tzid ?? null,
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
        <g className="states">
          {statesWithPaths.map((state) => (
            state.path && (
              <path
                key={state.id}
                d={state.path}
                fill={state.color}
                stroke="#333"
                strokeWidth={0.5}
                className="state-path"
                onMouseEnter={(e) => handleMouseEnter(state, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick(state, e);
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
          <div className="tooltip-name">{activeTooltip.name}</div>
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

