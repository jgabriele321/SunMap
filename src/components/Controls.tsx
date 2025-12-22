/**
 * Controls component - Day of year slider and date display
 */

import { useCallback } from 'react';
import { formatMinutesToHHMM } from '../lib/sun';

interface ControlsProps {
  dayOfYear: number;
  maxDays: number;
  dateReadable: string;
  avgMinutes: number | null;
  countyCount: number;
  onDayChange: (day: number) => void;
}

export function Controls({
  dayOfYear,
  maxDays,
  dateReadable,
  avgMinutes,
  countyCount,
  onDayChange,
}: ControlsProps) {
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onDayChange(parseInt(e.target.value, 10));
    },
    [onDayChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value >= 1 && value <= maxDays) {
        onDayChange(value);
      }
    },
    [onDayChange, maxDays]
  );

  // Format average sunset time
  const avgSunsetDisplay =
    avgMinutes !== null ? formatMinutesToHHMM(avgMinutes) : '--:--';

  return (
    <div className="controls">
      {/* Full-width slider row */}
      <div className="slider-row">
        <label htmlFor="day-slider">Day of Year</label>
        <div className="slider-container">
          <input
            id="day-slider"
            type="range"
            min={1}
            max={maxDays}
            value={dayOfYear}
            onChange={handleSliderChange}
            className="day-slider"
          />
          <input
            type="number"
            min={1}
            max={maxDays}
            value={dayOfYear}
            onChange={handleInputChange}
            className="day-input"
          />
        </div>
      </div>

      {/* Date and sunset info row */}
      <div className="info-row">
        <div className="date-display">
          <span className="date-value">{dateReadable}</span>
        </div>

        <div className="avg-display">
          <span className="avg-label">US Avg Sunset</span>
          <span className="avg-time">{avgSunsetDisplay}</span>
        </div>
      </div>

      <p className="controls-explanation">
        Colors show how each county's sunset compares to the U.S. average clock time for this day.
        <br />
        <span className="color-hint warm">Warm colors = later sunset</span> · 
        <span className="color-hint cool">Cool colors = earlier sunset</span>
        <span className="county-note"> · {countyCount.toLocaleString()} counties</span>
      </p>
    </div>
  );
}
