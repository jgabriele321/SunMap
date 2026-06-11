/**
 * World data utilities
 *
 * Loads the precomputed global land dot-grid (see scripts/build-grid.mjs)
 * and the world-atlas country shapes used for the globe backdrop.
 *
 * Grid points are stored in typed arrays for fast per-frame iteration,
 * including precomputed unit vectors used for hemisphere visibility tests.
 */

import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Geometry, MultiLineString } from 'geojson';
import countriesTopology from 'world-atlas/countries-110m.json';
import gridData from '../data/landgrid.json';

export interface LandGrid {
  n: number;
  lon: Float32Array;
  lat: Float32Array;
  // Unit vectors on the sphere (for fast visibility / nearest-point tests)
  vx: Float32Array;
  vy: Float32Array;
  vz: Float32Array;
  tzIdx: Uint16Array;
  countryIdx: Uint16Array;
  tz: string[];
  countries: string[];
}

export interface WorldShapes {
  land: FeatureCollection<Geometry> | { type: 'Feature'; geometry: Geometry; properties: object };
  borders: MultiLineString;
}

interface RawGrid {
  tz: string[];
  countries: string[];
  points: [number, number, number, number][];
}

const RAD = Math.PI / 180;

let cachedGrid: LandGrid | null = null;

export function getLandGrid(): LandGrid {
  if (cachedGrid) return cachedGrid;

  const raw = gridData as RawGrid;
  const n = raw.points.length;
  const grid: LandGrid = {
    n,
    lon: new Float32Array(n),
    lat: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    vz: new Float32Array(n),
    tzIdx: new Uint16Array(n),
    countryIdx: new Uint16Array(n),
    tz: raw.tz,
    countries: raw.countries,
  };

  for (let i = 0; i < n; i++) {
    const [lon, lat, tzIdx, countryIdx] = raw.points[i];
    grid.lon[i] = lon;
    grid.lat[i] = lat;
    const cosLat = Math.cos(lat * RAD);
    grid.vx[i] = cosLat * Math.cos(lon * RAD);
    grid.vy[i] = cosLat * Math.sin(lon * RAD);
    grid.vz[i] = Math.sin(lat * RAD);
    grid.tzIdx[i] = tzIdx;
    grid.countryIdx[i] = countryIdx;
  }

  cachedGrid = grid;
  return grid;
}

let cachedShapes: WorldShapes | null = null;

export function getWorldShapes(): WorldShapes {
  if (cachedShapes) return cachedShapes;

  const topology = countriesTopology as unknown as Topology<{
    countries: GeometryCollection<{ name?: string }>;
    land: GeometryCollection;
  }>;

  cachedShapes = {
    land: feature(topology, topology.objects.land) as WorldShapes['land'],
    // All country boundaries (internal + coastline)
    borders: mesh(topology, topology.objects.countries),
  };

  return cachedShapes;
}
