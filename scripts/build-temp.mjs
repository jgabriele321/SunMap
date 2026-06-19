/**
 * Build script: sample WorldClim 2.1 monthly temperature normals (10 arc-min,
 * 1970-2000 climatology) for every land grid point.
 *
 * Reads the existing land grid (src/data/landgrid.json) so indices line up
 * 1:1 with it, then for each point pulls the 12 monthly average daily-min
 * (tmin) and daily-max (tmax) temperatures.
 *
 * Output: src/data/tempgrid.json
 *   { tmin: number[n*12], tmax: number[n*12] }  // tenths of °C, month-major:
 *   point i, month m  →  index i*12 + m
 *
 * Requires the WorldClim GeoTIFFs unzipped in /tmp/worldclim:
 *   wc2.1_10m_tmin_01.tif ... _12.tif  and  wc2.1_10m_tmax_01.tif ... _12.tif
 * (download: https://geodata.ucdavis.edu/climate/worldclim/2_1/base/)
 *
 * Run: node scripts/build-temp.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { fromFile } = require('geotiff');

const __dirname = dirname(fileURLToPath(import.meta.url));
const WC_DIR = '/tmp/worldclim';

const W = 2160;
const H = 1080;
const NODATA = -1e30; // anything this low is WorldClim's -3.4e38 fill (ocean)

const gridPath = join(__dirname, '..', 'src', 'data', 'landgrid.json');
const grid = JSON.parse(readFileSync(gridPath, 'utf8'));
const points = grid.points; // [lon, lat, tzIdx, countryIdx]
const n = points.length;
console.log(`${n} land points to sample`);

/** Read one monthly band into a flat Float32Array */
async function readBand(variable, month) {
  const mm = String(month).padStart(2, '0');
  const path = join(WC_DIR, `wc2.1_10m_${variable}_${mm}.tif`);
  const tiff = await fromFile(path);
  const image = await tiff.getImage();
  const rasters = await image.readRasters();
  return rasters[0];
}

/**
 * Sample a raster at lon/lat. If the nearest pixel is nodata (coastal point
 * over an ocean pixel), spiral outward up to `maxRing` pixels for a valid one.
 */
function sample(raster, lon, lat) {
  const x0 = Math.min(W - 1, Math.max(0, Math.floor((lon + 180) / (360 / W))));
  const y0 = Math.min(H - 1, Math.max(0, Math.floor((90 - lat) / (180 / H))));

  const v0 = raster[y0 * W + x0];
  if (v0 > NODATA) return v0;

  for (let ring = 1; ring <= 5; ring++) {
    let best = null;
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue; // ring edge only
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const v = raster[y * W + x];
        if (v > NODATA && (best === null || Math.abs(dx) + Math.abs(dy) < best.d)) {
          best = { v, d: Math.abs(dx) + Math.abs(dy) };
        }
      }
    }
    if (best) return best.v;
  }
  return null;
}

const tmin = new Array(n * 12).fill(0);
const tmax = new Array(n * 12).fill(0);
let missing = 0;

const t0 = Date.now();
for (let m = 0; m < 12; m++) {
  const tminBand = await readBand('tmin', m + 1);
  const tmaxBand = await readBand('tmax', m + 1);
  for (let i = 0; i < n; i++) {
    const [lon, lat] = points[i];
    const lo = sample(tminBand, lon, lat);
    const hi = sample(tmaxBand, lon, lat);
    if (lo === null || hi === null) {
      missing++;
      // Leave as 0; the app treats exact 0/0 pairs as "no data"
      continue;
    }
    tmin[i * 12 + m] = Math.round(lo * 10);
    tmax[i * 12 + m] = Math.round(hi * 10);
  }
  console.log(`month ${m + 1}/12 done (${Date.now() - t0}ms)`);
}

console.log(`${missing} point-months had no nearby land pixel (left as 0)`);

const out = { tmin, tmax };
const outPath = join(__dirname, '..', 'src', 'data', 'tempgrid.json');
mkdirSync(dirname(outPath), { recursive: true });
const json = JSON.stringify(out);
writeFileSync(outPath, json);
console.log(`Wrote ${outPath} (${(json.length / 1024).toFixed(0)} KB)`);
