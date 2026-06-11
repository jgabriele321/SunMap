# 🌍 SunMap — Global Sunset Times

An interactive 3D globe showing when the sun sets everywhere on Earth, for any day of the year. Every dot is a point on land, colored by how its local sunset *clock time* compares to the world average — blue sets earlier, red sets later.

Live at **https://sunmap.dwings.app**

## Features

- **Interactive globe**: drag to spin (mouse or finger), pinch to zoom on phone, two-finger scroll / pinch gesture on a trackpad, double-tap to reset
- **Any day of the year**: slider plus presets for the solstices, equinoxes, and today. The date is year-agnostic — sunset patterns repeat every year, so no year is shown
- **Dot detail**: hover (or tap) any dot for its country, coordinates, local sunset time, delta vs world average, and IANA timezone
- **Timezone stripes**: inside wide timezones the east edge sets early and the west edge sets late by the clock — the striping you see across Russia, the US, and China is real
- **Polar handling**: dots with no sunset (midnight sun / polar night) are dimmed
- **Fully offline**: all computation happens in the browser — no API calls

## How It Works

1. **Land grid** (build time, `scripts/build-grid.mjs`): an equal-area dot grid (~8,300 points at 1.2° spacing) is sampled over land using world-atlas country polygons. Each point's IANA timezone (tz-lookup) and country are precomputed into `src/data/landgrid.json`
2. **Sunset instant**: SunCalc computes the UTC sunset moment at each point for the selected date
3. **Local clock time**: one Luxon offset lookup per timezone per date converts those instants to local minutes-after-midnight
4. **Average & delta**: the global mean is computed; each point's delta drives a diverging blue → neutral → red color scale, normalized at the 95th percentile so outliers don't wash out the map
5. **Rendering**: canvas + d3-geo orthographic projection; view state lives in refs so gestures repaint the canvas without re-rendering React

## Tech Stack

- **Vite + React 19 + TypeScript**
- **d3-geo** — orthographic projection and geometry
- **topojson-client + world-atlas** — country shapes (110m)
- **SunCalc** — astronomical calculations
- **Luxon** — timezone-aware date/time handling
- **tz-lookup** — lat/lon → timezone (build time only)

## Getting Started

```bash
npm install
npm run dev        # development server
npm run build      # production build (tsc + vite)
node scripts/build-grid.mjs   # regenerate the land grid (only needed if grid params change)
```

## Project Structure

```
scripts/build-grid.mjs   # generates src/data/landgrid.json
src/
├── App.tsx              # state, layout, per-day color computation
├── App.css              # all styles
├── components/
│   ├── Globe.tsx        # canvas globe, gestures, tooltip
│   ├── Controls.tsx     # date slider + presets
│   └── Legend.tsx       # color scale
└── lib/
    ├── world.ts         # land grid + country shapes loading
    ├── sun.ts           # sunset computation
    ├── colors.ts        # diverging color scale
    └── date.ts          # year-agnostic day-of-year helpers
```
