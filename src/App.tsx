/**
 * SunMap - US Sunset Time Visualization (County Level)
 * 
 * ## How Computation Works
 * 
 * This app displays an interactive map of the contiguous United States,
 * coloring each county based on how its sunset time compares to the
 * national average for a given day.
 * 
 * ### Core Algorithm
 * 
 * 1. **Geographic Centroids**: For each county, compute a geographic
 *    centroid using d3-geo on unprojected GeoJSON data from us-atlas.
 * 
 * 2. **Timezone Lookup**: Using the centroid coordinates, look up the IANA
 *    timezone identifier (e.g., "America/New_York") using tz-lookup.
 * 
 * 3. **Sunset Calculation**: Use SunCalc to compute the exact UTC instant of
 *    sunset at each centroid. Pass UTC noon to avoid off-by-one date issues.
 * 
 * 4. **Local Time Conversion**: Convert sunset instant to local timezone using
 *    Luxon and extract "minutes after midnight".
 * 
 * 5. **Average & Delta**: Compute national average and each county's delta.
 * 
 * 6. **Color Mapping**: Map deltas to a blue (early) → neutral → red (late)
 *    color scale.
 * 
 * @author SunMap
 * @license MIT
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Controls } from './components/Controls';
import { UsMap } from './components/UsMap';
import { Legend } from './components/Legend';
import { getCountyFeatures } from './lib/map';
import { dayOfYearToISO, daysInYear, formatDateReadable } from './lib/date';
import { computeStateSunsets, type SunsetData } from './lib/sun';
import './App.css';

// Year for the app
const YEAR = 2026;

// Debounce delay in milliseconds
const DEBOUNCE_MS = 100;

function App() {
  // Day of year (1-365)
  const [dayOfYear, setDayOfYear] = useState<number>(172); // ~summer solstice
  const [debouncedDay, setDebouncedDay] = useState<number>(dayOfYear);
  const [isComputing, setIsComputing] = useState(false);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get max days in year
  const maxDays = useMemo(() => daysInYear(YEAR), []);

  // Load county features once
  const countyFeatures = useMemo(() => getCountyFeatures(), []);

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

  // Compute sunset data
  const [sunsetData, setSunsetData] = useState<SunsetData | null>(null);

  useEffect(() => {
    setIsComputing(true);
    
    // Use requestAnimationFrame to let the UI update before computing
    const rafId = requestAnimationFrame(() => {
      const startTime = performance.now();
      const data = computeStateSunsets(dateISO, countyFeatures);
      const endTime = performance.now();
      
      console.log(
        `Sunset computation for ${countyFeatures.length} counties took ${(endTime - startTime).toFixed(1)}ms`
      );
      
      setSunsetData(data);
      setIsComputing(false);
    });

    return () => cancelAnimationFrame(rafId);
  }, [dateISO, countyFeatures]);

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
          countyCount={countyFeatures.length}
          onDayChange={handleDayChange}
        />

        {isComputing && (
          <div className="computing-indicator">
            Computing sunset times for {countyFeatures.length} counties...
          </div>
        )}

        <div className="map-legend-container">
          <UsMap
            features={countyFeatures}
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
        <p className="footer-year">Year: {YEAR} · Contiguous US only</p>
      </footer>
    </div>
  );
}

export default App;
