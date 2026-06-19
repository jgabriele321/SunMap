/**
 * Controls component - Day of year slider with date display and presets
 *
 * The right-hand stat is supplied by the host app (e.g. "World avg sunset")
 * so this component is shared across the sunset and temperature views.
 */

import { useCallback } from 'react';
import { DAYS_IN_YEAR, todayDayOfYear } from '../lib/date';

interface ControlsProps {
  dayOfYear: number;
  dateReadable: string;
  /** Optional headline stat shown to the right of the date */
  stat?: { label: string; value: string } | null;
  onDayChange: (day: number) => void;
}

// Day-of-year for the seasonal landmarks (non-leap year)
const PRESETS: { label: string; day: number }[] = [
  { label: 'Mar equinox', day: 79 },
  { label: 'Jun solstice', day: 172 },
  { label: 'Sep equinox', day: 265 },
  { label: 'Dec solstice', day: 355 },
];

export function Controls({ dayOfYear, dateReadable, stat, onDayChange }: ControlsProps) {
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onDayChange(parseInt(e.target.value, 10));
    },
    [onDayChange]
  );

  return (
    <div className="controls">
      <div className="controls-top">
        <div className="date-display">
          <span className="date-label">Date</span>
          <span className="date-value">{dateReadable}</span>
        </div>
        {stat && (
          <div className="avg-display">
            <span className="avg-label">{stat.label}</span>
            <span className="avg-time">{stat.value}</span>
          </div>
        )}
      </div>

      <input
        id="day-slider"
        type="range"
        min={1}
        max={DAYS_IN_YEAR}
        value={dayOfYear}
        onChange={handleSliderChange}
        className="day-slider"
        aria-label="Day of year"
      />

      <div className="presets">
        <button className="preset-btn today" onClick={() => onDayChange(todayDayOfYear())}>
          Today
        </button>
        {PRESETS.map((p) => (
          <button
            key={p.day}
            className={`preset-btn ${dayOfYear === p.day ? 'active' : ''}`}
            onClick={() => onDayChange(p.day)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
