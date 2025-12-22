/**
 * Type declarations for packages without TypeScript definitions
 */

// us-atlas provides TopoJSON files
declare module 'us-atlas/states-10m.json' {
  import type { Topology } from 'topojson-specification';
  const topology: Topology;
  export default topology;
}

declare module 'us-atlas/counties-10m.json' {
  import type { Topology } from 'topojson-specification';
  const topology: Topology;
  export default topology;
}

// tz-lookup for timezone lookups from coordinates
declare module 'tz-lookup' {
  /**
   * Look up the IANA timezone identifier for a given lat/lon
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns IANA timezone identifier (e.g., "America/New_York")
   */
  function tzlookup(lat: number, lon: number): string;
  export = tzlookup;
}
