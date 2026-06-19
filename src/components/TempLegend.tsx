/**
 * TempLegend - absolute temperature color scale (cold → hot)
 */

import { tempLegendGradient, TEMP_RANGE } from '../lib/temp';

export function TempLegend() {
  return (
    <div className="legend">
      <span className="legend-end earlier">{TEMP_RANGE.min}°C</span>
      <div className="legend-gradient" style={{ background: tempLegendGradient() }} />
      <span className="legend-end later">{TEMP_RANGE.max}°C</span>
    </div>
  );
}
