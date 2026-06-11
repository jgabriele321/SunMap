/**
 * Type declarations for packages without TypeScript definitions
 */

// world-atlas / us-atlas provide TopoJSON files
declare module 'world-atlas/countries-110m.json' {
  import type { Topology } from 'topojson-specification';
  const topology: Topology;
  export default topology;
}

declare module 'us-atlas/counties-10m.json' {
  import type { Topology } from 'topojson-specification';
  const topology: Topology;
  export default topology;
}

// tz-lookup for timezone lookups from coordinates (used by scripts/build-grid.mjs)
declare module 'tz-lookup' {
  function tzlookup(lat: number, lon: number): string;
  export = tzlookup;
}
