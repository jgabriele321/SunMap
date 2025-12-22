/**
 * Legend component - Shows the color scale for sunset time differences
 */

import { getLegendColors } from '../lib/colors';

interface LegendProps {
  maxDeltaMinutes: number;
}

export function Legend({ maxDeltaMinutes }: LegendProps) {
  const colors = getLegendColors();
  
  // Format delta for display
  const formatDelta = (mins: number) => {
    if (mins === 0) return '±0';
    const sign = mins > 0 ? '+' : '';
    return `${sign}${Math.round(mins)} min`;
  };

  return (
    <div className="legend">
      <div className="legend-title">Sunset vs US Average</div>
      
      <div className="legend-scale">
        {/* Earlier side (cool colors) */}
        <div className="legend-end earlier">
          <span className="legend-label">{formatDelta(-maxDeltaMinutes)}</span>
          <span className="legend-desc">Earlier</span>
        </div>

        {/* Color gradient bar */}
        <div 
          className="legend-gradient"
          style={{
            background: `linear-gradient(to right, 
              ${colors.deepCool} 0%, 
              ${colors.nearCool} 30%, 
              ${colors.neutral} 50%, 
              ${colors.nearWarm} 70%, 
              ${colors.deepWarm} 100%
            )`
          }}
        />

        {/* Later side (warm colors) */}
        <div className="legend-end later">
          <span className="legend-label">{formatDelta(maxDeltaMinutes)}</span>
          <span className="legend-desc">Later</span>
        </div>
      </div>
    </div>
  );
}

