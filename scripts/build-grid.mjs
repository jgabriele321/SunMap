/**
 * Build script: generate an equal-area dot grid over global land.
 *
 * For each grid point we precompute:
 *   - lon/lat (rounded to 2 decimals)
 *   - IANA timezone (index into a string table)
 *   - country name (index into a string table)
 *
 * Output: src/data/landgrid.json
 *   { tz: string[], countries: string[], points: [lon, lat, tzIdx, countryIdx][] }
 *
 * Run: node scripts/build-grid.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { feature } = require('topojson-client');
const { geoContains } = require('d3-geo');
const tzlookup = require('tz-lookup');
const countriesTopo = require('world-atlas/countries-110m.json');

const __dirname = dirname(fileURLToPath(import.meta.url));

// Grid resolution: latitude step in degrees. Longitude step is widened by
// 1/cos(lat) so dots are evenly spaced on the sphere (equal-area sampling).
const LAT_STEP = 1.2;

const countries = feature(countriesTopo, countriesTopo.objects.countries).features;
console.log(`${countries.length} countries loaded`);

const tzTable = [];
const tzIndex = new Map();
const countryTable = [];
const countryIndex = new Map();

function intern(table, index, value) {
  if (index.has(value)) return index.get(value);
  const i = table.length;
  table.push(value);
  index.set(value, i);
  return i;
}

const points = [];
let tested = 0;
const t0 = Date.now();

for (let lat = -89; lat <= 89; lat += LAT_STEP) {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  if (cosLat <= 0.02) continue;
  const lonStep = LAT_STEP / cosLat;
  // Offset alternate rings so dots don't form vertical stripes
  const offset = ((lat / LAT_STEP) % 2) * (lonStep / 2);
  for (let lon = -180 + offset; lon < 180; lon += lonStep) {
    tested++;
    // Find which country contains this point (also serves as the land test)
    let countryName = null;
    for (const c of countries) {
      if (geoContains(c, [lon, lat])) {
        countryName = c.properties?.name || 'Unknown';
        break;
      }
    }
    if (!countryName) continue;

    let tz;
    try {
      tz = tzlookup(lat, lon);
    } catch {
      continue;
    }

    points.push([
      Math.round(lon * 100) / 100,
      Math.round(lat * 100) / 100,
      intern(tzTable, tzIndex, tz),
      intern(countryTable, countryIndex, countryName),
    ]);
  }
}

console.log(
  `Tested ${tested} points, kept ${points.length} land points in ${Date.now() - t0}ms`
);
console.log(`${tzTable.length} timezones, ${countryTable.length} countries with land points`);

const out = { tz: tzTable, countries: countryTable, points };
const outPath = join(__dirname, '..', 'src', 'data', 'landgrid.json');
mkdirSync(dirname(outPath), { recursive: true });
const json = JSON.stringify(out);
writeFileSync(outPath, json);
console.log(`Wrote ${outPath} (${(json.length / 1024).toFixed(0)} KB)`);
