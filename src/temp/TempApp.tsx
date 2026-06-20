/**
 * SunMap · Temperature — Global average-temperature globe
 *
 * Same interactive globe as the sunset view, but every land dot is colored by
 * its average daily temperature for the selected day of the year, on an
 * absolute blue → orange → red scale. Hover or tap a dot for the average high,
 * low, and mean.
 *
 * Data: WorldClim 2.1 monthly climate normals (1970-2000) sampled per dot at
 * build time, interpolated to the chosen day in the browser. Year-agnostic,
 * fully offline. There is no global average — the scale is absolute.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Controls } from '../components/Controls';
import { Globe, type DotInfo } from '../components/Globe';
import { TempLegend } from '../components/TempLegend';
import { PlacesLink } from '../components/PlacesLink';
import { getLandGrid } from '../lib/world';
import { dayOfYearToISO, formatDateReadable, todayDayOfYear } from '../lib/date';
import { computeTempDay, colorForTemp, formatTemp, type TempData } from '../lib/temp';
import { useDotList } from '../lib/useDotList';
import '../App.css';

const DEBOUNCE_MS = 80;

function TempApp() {
  const [dayOfYear, setDayOfYear] = useState<number>(() => todayDayOfYear());
  const [debouncedDay, setDebouncedDay] = useState<number>(dayOfYear);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const grid = useMemo(() => getLandGrid(), []);
  const dotList = useDotList(grid);

  useEffect(() => {
    document.title = 'SunMap — Global Temperatures';
  }, []);

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

  const dateReadable = useMemo(
    () => formatDateReadable(dayOfYearToISO(debouncedDay)),
    [debouncedDay]
  );

  const [tempData, setTempData] = useState<TempData | null>(null);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setTempData(computeTempDay(debouncedDay, grid));
    });
    return () => cancelAnimationFrame(rafId);
  }, [debouncedDay, grid]);

  const colors = useMemo(() => {
    if (!tempData) return null;
    const out = new Array<string>(grid.n);
    for (let i = 0; i < grid.n; i++) {
      out[i] = colorForTemp(tempData.avg[i]);
    }
    return out;
  }, [tempData, grid]);

  const getDotInfo = useCallback(
    (i: number): DotInfo | null => {
      if (!tempData) return null;
      return {
        title: grid.countries[grid.countryIdx[i]],
        subtitle: `${Math.abs(grid.lat[i]).toFixed(1)}°${grid.lat[i] >= 0 ? 'N' : 'S'}, ${Math.abs(grid.lon[i]).toFixed(1)}°${grid.lon[i] >= 0 ? 'E' : 'W'}`,
        rows: [
          { label: 'Avg high', value: formatTemp(tempData.hi[i]), className: 'later' },
          { label: 'Avg low', value: formatTemp(tempData.lo[i]), className: 'earlier' },
          { label: 'Mean', value: formatTemp(tempData.avg[i]) },
        ],
      };
    },
    [tempData, grid]
  );

  return (
    <div className="app">
      <header className="app-header">
        <PlacesLink />
        <h1>
          <span className="logo-mark">🌡</span> SunMap
        </h1>
        <p className="app-subtitle">Average temperatures around the world</p>
      </header>

      <main className="app-main">
        <div className="globe-stage">
          <Globe
            grid={grid}
            colors={colors}
            getDotInfo={getDotInfo}
            isInList={dotList.isInList}
            onToggleList={dotList.toggle}
          />
          <TempLegend />
        </div>

        <Controls dayOfYear={dayOfYear} dateReadable={dateReadable} onDayChange={handleDayChange} />

        <p className="explainer">
          Each dot is a point on land, colored by its{' '}
          <em>average temperature</em> for this date —{' '}
          <span className="hint-cool">blue is cold</span>,{' '}
          <span className="hint-warm">orange and red are hot</span>. Hover or tap
          for the average daily high and low. Based on 1970–2000 climate normals,
          so it's the typical temperature for the day, the same every year.
        </p>
      </main>

      <footer className="app-footer">
        <p>
          {grid.n.toLocaleString()} land points · WorldClim climate normals ·
          computed locally · same every year ·{' '}
          <a href="/">🌅 sunset view</a> · <a href="/USA">US county view</a>
        </p>
      </footer>
    </div>
  );
}

export default TempApp;
