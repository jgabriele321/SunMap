/**
 * SunMap - Global Sunset Time Visualization
 *
 * An interactive 3D globe where every dot is a point on land, colored by how
 * its local sunset clock time compares to the world average for the selected
 * day of the year. The date is year-agnostic — sunset patterns repeat
 * annually, so computation is anchored to a fixed reference year that is
 * never displayed.
 *
 * Pipeline per day: SunCalc (UTC sunset instant per dot) → precomputed IANA
 * timezone offset (Luxon, one per zone) → local clock minutes → delta vs
 * global mean → diverging color scale. All client-side, no API calls.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Controls } from './components/Controls';
import { Globe } from './components/Globe';
import { Legend } from './components/Legend';
import { getLandGrid } from './lib/world';
import { dayOfYearToISO, formatDateReadable, todayDayOfYear } from './lib/date';
import { computeGridSunsets, type SunsetData } from './lib/sun';
import { colorForDelta } from './lib/colors';
import './App.css';

const DEBOUNCE_MS = 80;

function App() {
  const [dayOfYear, setDayOfYear] = useState<number>(() => todayDayOfYear());
  const [debouncedDay, setDebouncedDay] = useState<number>(dayOfYear);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const grid = useMemo(() => getLandGrid(), []);

  const handleDayChange = useCallback((day: number) => {
    setDayOfYear(day);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedDay(day), DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const dateISO = useMemo(() => dayOfYearToISO(debouncedDay), [debouncedDay]);
  const dateReadable = useMemo(() => formatDateReadable(dateISO), [dateISO]);

  const [sunsetData, setSunsetData] = useState<SunsetData | null>(null);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setSunsetData(computeGridSunsets(dateISO, grid));
    });
    return () => cancelAnimationFrame(rafId);
  }, [dateISO, grid]);

  // Per-dot colors, recomputed once per day change (not per frame)
  const colors = useMemo(() => {
    if (!sunsetData) return null;
    const out = new Array<string>(grid.n);
    for (let i = 0; i < grid.n; i++) {
      out[i] = colorForDelta(sunsetData.delta[i], sunsetData.scaleMax);
    }
    return out;
  }, [sunsetData, grid]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="logo-mark">☀</span> SunMap
        </h1>
        <p className="app-subtitle">When the sun sets around the world</p>
      </header>

      <main className="app-main">
        <div className="globe-stage">
          <Globe grid={grid} sunset={sunsetData} colors={colors} />
          <Legend maxDeltaMinutes={sunsetData?.scaleMax ?? 60} />
        </div>

        <Controls
          dayOfYear={dayOfYear}
          dateReadable={dateReadable}
          avgMinutes={sunsetData?.avgMinutes ?? null}
          onDayChange={handleDayChange}
        />

        <p className="explainer">
          Each dot is a point on land, colored by how its local sunset{' '}
          <em>clock time</em> compares to the world average for this date —{' '}
          <span className="hint-cool">blue sets earlier</span>,{' '}
          <span className="hint-warm">red sets later</span>. The stripes inside
          wide timezones are real: clocks are shared, the sun isn't. Dim dots
          have no sunset at all (polar day or night).
        </p>
      </main>

      <footer className="app-footer">
        <p>
          {grid.n.toLocaleString()} land points · computed locally with{' '}
          <a href="https://github.com/mourner/suncalc" target="_blank" rel="noopener noreferrer">
            SunCalc
          </a>{' '}
          · no API calls · same every year
        </p>
      </footer>
    </div>
  );
}

export default App;
