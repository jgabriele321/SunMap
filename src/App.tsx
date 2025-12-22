/**
 * SunMap - US Sunset Time Visualization
 * 
 * ## How Computation Works
 * 
 * This app displays an interactive map of the United States, coloring each state
 * based on how its sunset time compares to the national average for a given day.
 * 
 * ### Core Algorithm
 * 
 * 1. **State Centroids**: For each US state, we compute a geographic centroid
 *    (longitude, latitude) using d3-geo's geoCentroid function on unprojected
 *    GeoJSON data from us-atlas (states-10m.json). This gives us real geographic
 *    coordinates, not projected map coordinates.
 * 
 * 2. **Timezone Lookup**: Using the centroid coordinates, we look up the IANA
 *    timezone identifier (e.g., "America/New_York") using tz-lookup.
 * 
 * 3. **Sunset Calculation**: For the selected date, we use SunCalc to compute
 *    the exact UTC instant of sunset at each state's centroid. To avoid
 *    off-by-one date issues, we pass UTC noon of the target date to SunCalc.
 * 
 * 4. **Local Time Conversion**: The sunset instant (UTC) is converted to the
 *    state's local timezone using Luxon. We extract the local clock time as
 *    "minutes after midnight" (hour * 60 + minute).
 * 
 * 5. **National Average**: We compute the simple arithmetic mean of all states'
 *    local sunset minutes. This represents an "average clock time" - what time
 *    the sun sets across America if you average the local times.
 * 
 * 6. **Delta Calculation**: Each state's deviation from the average is computed.
 *    Positive delta = later sunset, negative delta = earlier sunset.
 * 
 * 7. **Color Mapping**: Deltas are normalized by the maximum absolute delta and
 *    mapped to a color scale:
 *    - Blue tones: earlier than average
 *    - Neutral/cream: near average
 *    - Orange/red tones: later than average
 * 
 * ### Important Notes
 * 
 * - All computation is done locally; no external API calls for sun times.
 * - The map uses Albers USA projection for DISPLAY only (handles Alaska/Hawaii).
 * - Results are cached in memory by date to avoid recomputation.
 * - Slider changes are debounced to prevent excessive recalculation.
 * 
 * @author SunMap
 * @license MIT
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Controls } from './components/Controls';
import { UsMap } from './components/UsMap';
import { Legend } from './components/Legend';
import { getStateFeatures } from './lib/map';
import { dayOfYearToISO, daysInYear, formatDateReadable } from './lib/date';
import { computeStateSunsets, type SunsetData } from './lib/sun';
import './App.css';

// Fixed year for the app
const YEAR = 2025;

// Debounce delay in milliseconds
const DEBOUNCE_MS = 100;

function App() {
  // Day of year (1-365)
  const [dayOfYear, setDayOfYear] = useState<number>(172); // Default to ~summer solstice
  const [debouncedDay, setDebouncedDay] = useState<number>(dayOfYear);
  const [isComputing, setIsComputing] = useState(false);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get max days in year
  const maxDays = useMemo(() => daysInYear(YEAR), []);

  // Load state features once
  const stateFeatures = useMemo(() => getStateFeatures(), []);

  // Debounce day changes
  const handleDayChange = useCallback((day: number) => {
    setDayOfYear(day);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      setDebouncedDay(day);
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Compute date values
  const dateISO = useMemo(() => dayOfYearToISO(YEAR, debouncedDay), [debouncedDay]);
  const dateReadable = useMemo(() => formatDateReadable(dateISO), [dateISO]);

  // Compute sunset data (memoized and cached internally)
  const [sunsetData, setSunsetData] = useState<SunsetData | null>(null);

  useEffect(() => {
    setIsComputing(true);
    
    // Use requestAnimationFrame to let the UI update before computing
    const rafId = requestAnimationFrame(() => {
      const startTime = performance.now();
      const data = computeStateSunsets(dateISO, stateFeatures);
      const endTime = performance.now();
      
      console.log(`Sunset computation took ${(endTime - startTime).toFixed(1)}ms for ${dateISO}`);
      
      setSunsetData(data);
      setIsComputing(false);
    });

    return () => cancelAnimationFrame(rafId);
  }, [dateISO, stateFeatures]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌅 SunMap</h1>
        <p className="app-subtitle">US Sunset Time Visualization</p>
      </header>

      <main className="app-main">
        <Controls
          dayOfYear={dayOfYear}
          maxDays={maxDays}
          dateISO={dateISO}
          dateReadable={dateReadable}
          avgMinutes={sunsetData?.avgMinutes ?? null}
          onDayChange={handleDayChange}
        />

        {isComputing && (
          <div className="computing-indicator">
            Computing sunset times...
          </div>
        )}

        <div className="map-legend-container">
          <UsMap
            stateFeatures={stateFeatures}
            sunsetData={sunsetData}
          />
          
          <Legend 
            maxDeltaMinutes={sunsetData?.maxAbsDelta ?? 60} 
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Sun times computed locally with{' '}
          <a href="https://github.com/mourner/suncalc" target="_blank" rel="noopener noreferrer">
            SunCalc
          </a>
          . No external API calls.
        </p>
        <p className="footer-year">Year: {YEAR}</p>
      </footer>
    </div>
  );
}

export default App;
