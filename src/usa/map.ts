/**
 * Map data utilities for loading and preparing US county features
 * 
 * IMPORTANT: We use the UNPROJECTED topology so that:
 * 1. Centroids are computed in real lon/lat coordinates
 * 2. We can look up timezone from centroid coordinates
 * 3. SunCalc gets correct geographic coordinates
 * 
 * The Albers projection is only applied for DISPLAY, not for centroid calculation.
 */

import { feature } from 'topojson-client';
import { geoCentroid } from 'd3-geo';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import countiesTopology from 'us-atlas/counties-10m.json';
import tzlookup from 'tz-lookup';

export interface CountyFeature {
  id: string;
  name: string;
  stateName: string;
  stateId: string;
  feature: Feature<Geometry>;
  centroidLonLat: [number, number] | null;
  tzid: string | null;
}

// FIPS code to state name mapping
const FIPS_TO_NAME: Record<string, string> = {
  '01': 'Alabama',
  '04': 'Arizona',
  '05': 'Arkansas',
  '06': 'California',
  '08': 'Colorado',
  '09': 'Connecticut',
  '10': 'Delaware',
  '11': 'District of Columbia',
  '12': 'Florida',
  '13': 'Georgia',
  '16': 'Idaho',
  '17': 'Illinois',
  '18': 'Indiana',
  '19': 'Iowa',
  '20': 'Kansas',
  '21': 'Kentucky',
  '22': 'Louisiana',
  '23': 'Maine',
  '24': 'Maryland',
  '25': 'Massachusetts',
  '26': 'Michigan',
  '27': 'Minnesota',
  '28': 'Mississippi',
  '29': 'Missouri',
  '30': 'Montana',
  '31': 'Nebraska',
  '32': 'Nevada',
  '33': 'New Hampshire',
  '34': 'New Jersey',
  '35': 'New Mexico',
  '36': 'New York',
  '37': 'North Carolina',
  '38': 'North Dakota',
  '39': 'Ohio',
  '40': 'Oklahoma',
  '41': 'Oregon',
  '42': 'Pennsylvania',
  '44': 'Rhode Island',
  '45': 'South Carolina',
  '46': 'South Dakota',
  '47': 'Tennessee',
  '48': 'Texas',
  '49': 'Utah',
  '50': 'Vermont',
  '51': 'Virginia',
  '53': 'Washington',
  '54': 'West Virginia',
  '55': 'Wisconsin',
  '56': 'Wyoming',
};

// States/territories to exclude (non-contiguous US)
const EXCLUDED_STATE_FIPS = new Set([
  '02', // Alaska
  '15', // Hawaii
  '60', // American Samoa
  '66', // Guam
  '69', // Northern Mariana Islands
  '72', // Puerto Rico
  '78', // US Virgin Islands
]);

// Cache for prepared features
let cachedCountyFeatures: CountyFeature[] | null = null;

/**
 * Compute centroid and lookup timezone for a feature
 */
function computeCentroidAndTimezone(
  feat: Feature<Geometry>,
  name: string
): { centroidLonLat: [number, number] | null; tzid: string | null } {
  let centroidLonLat: [number, number] | null = null;
  let tzid: string | null = null;

  try {
    const centroid = geoCentroid(feat);
    
    // Validate centroid is in reasonable lon/lat range
    if (
      centroid &&
      !isNaN(centroid[0]) &&
      !isNaN(centroid[1]) &&
      Math.abs(centroid[0]) <= 180 &&
      Math.abs(centroid[1]) <= 90
    ) {
      centroidLonLat = centroid as [number, number];
      
      // Look up timezone from centroid coordinates
      // tz-lookup takes (lat, lon) - note the order!
      try {
        tzid = tzlookup(centroid[1], centroid[0]);
      } catch {
        // Some ocean/boundary centroids may fail silently
      }
    }
  } catch (e) {
    console.warn(`Could not compute centroid for ${name}:`, e);
  }

  return { centroidLonLat, tzid };
}

/**
 * Load and prepare county features from us-atlas topology
 */
export function getCountyFeatures(): CountyFeature[] {
  if (cachedCountyFeatures) {
    return cachedCountyFeatures;
  }

  const topology = countiesTopology as Topology<{
    counties: GeometryCollection<{ name?: string }>;
  }>;

  const countiesGeoJson = feature(topology, topology.objects.counties);
  const features: CountyFeature[] = [];

  for (const feat of countiesGeoJson.features) {
    // County FIPS is 5 digits: first 2 are state, last 3 are county
    const fullId = String(feat.id).padStart(5, '0');
    const stateId = fullId.slice(0, 2);
    
    // Skip counties in excluded states (Alaska, Hawaii, Puerto Rico)
    if (EXCLUDED_STATE_FIPS.has(stateId)) {
      continue;
    }
    
    const stateName = FIPS_TO_NAME[stateId] || `State ${stateId}`;
    
    // County name from properties or generic
    const countyName = (feat.properties?.name as string) || `County ${fullId.slice(2)}`;
    
    const { centroidLonLat, tzid } = computeCentroidAndTimezone(
      feat as Feature<Geometry>,
      `${countyName}, ${stateName}`
    );

    features.push({
      id: fullId,
      name: countyName,
      stateName,
      stateId,
      feature: feat as Feature<Geometry>,
      centroidLonLat,
      tzid,
    });
  }

  console.log(`Loaded ${features.length} counties (contiguous US)`);
  cachedCountyFeatures = features;
  return features;
}
