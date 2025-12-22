# 🌅 SunMap - US Sunset Time Visualization

An interactive web app that displays a map of the United States, coloring each state based on how its sunset time compares to the national average for any day of the year.

## Features

- **Interactive Day Selection**: Slider and numeric input to select any day of year (1-365) for 2025
- **Dynamic Map Coloring**: States colored based on sunset time deviation from US average
  - 🔵 Blue tones = earlier sunset
  - 🔴 Red/orange tones = later sunset
- **Detailed Tooltips**: Hover or click any state to see:
  - State name
  - Local sunset time (HH:MM)
  - Delta from average (e.g., +23 min)
  - IANA timezone identifier
- **Fully Offline**: All sun calculations done locally with math—no API calls
- **Responsive Design**: Works on desktop and mobile

## How It Works

1. **State Centroids**: Each state's geographic center is computed from unprojected GeoJSON data
2. **Timezone Lookup**: The centroid coordinates determine the IANA timezone (e.g., "America/New_York")
3. **Sunset Calculation**: SunCalc computes the exact UTC instant of sunset at each centroid
4. **Local Time Conversion**: Luxon converts UTC sunset to local clock time
5. **Average & Delta**: National average is computed; each state gets a delta (positive = later)
6. **Color Mapping**: Deltas normalized and mapped to a blue→neutral→red color scale

## Tech Stack

- **Vite + React + TypeScript** - Build tooling and UI
- **d3-geo** - Map projection and geometry
- **topojson-client + us-atlas** - US state boundaries
- **SunCalc** - Astronomical calculations
- **Luxon** - Timezone-aware date/time handling
- **tz-lookup** - Lat/lon to timezone conversion

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── App.tsx              # Main app component with state and layout
├── App.css              # All styles
├── components/
│   ├── Controls.tsx     # Day slider, date display, average sunset
│   ├── UsMap.tsx        # SVG map with tooltips
│   └── Legend.tsx       # Color scale legend
├── lib/
│   ├── date.ts          # Day-of-year to ISO date conversion
│   ├── sun.ts           # Sunset computation and caching
│   ├── colors.ts        # Delta to color interpolation
│   └── map.ts           # State feature loading and preparation
└── types/
    └── modules.d.ts     # Type declarations for untyped packages
```

## Notes

- Uses **unprojected** us-atlas data (`states-10m.json`) for accurate centroid calculation
- Albers USA projection used only for display (properly repositions Alaska/Hawaii)
- Results cached in memory by date to avoid recomputation
- Slider changes debounced for smooth performance

## License

MIT
