/**
 * Legend component - Color scale for sunset time vs world average
 */

import { legendGradient } from '../lib/colors';

interface LegendProps {
  maxDeltaMinutes: number;
}

export function Legend({ maxDeltaMinutes }: LegendProps) {
  const fmt = (mins: number) => {
    const h = Math.abs(mins) >= 90 ? `${(Math.abs(mins) / 60).toFixed(1)}h` : `${Math.round(Math.abs(mins))}m`;
    return `${mins < 0 ? '−' : '+'}${h}`;
  };

  return (
    <div className="legend">
      <span className="legend-end earlier">{fmt(-maxDeltaMinutes)} earlier</span>
      <div className="legend-gradient" style={{ background: legendGradient() }} />
      <span className="legend-end later">{fmt(maxDeltaMinutes)} later</span>
    </div>
  );
}
