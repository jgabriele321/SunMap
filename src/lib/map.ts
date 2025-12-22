/**
 * Map data utilities for loading and preparing US state features
 * 
 * IMPORTANT: We use the UNPROJECTED topology (states-10m.json) so that:
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
import statesTopology from 'us-atlas/states-10m.json';
import tzlookup from 'tz-lookup';

export interface StateFeature {
  id: string;
  name: string;
  feature: Feature<Geometry>;
  centroidLonLat: [number, number] | null;
  tzid: string | null;
}

// FIPS code to state name mapping
// Used because us-atlas may not include state names in properties
const FIPS_TO_NAME: Record<string, string> = {
  '01': 'Alabama',
  '02': 'Alaska',
  '04': 'Arizona',
  '05': 'Arkansas',
  '06': 'California',
  '08': 'Colorado',
  '09': 'Connecticut',
  '10': 'Delaware',
  '11': 'District of Columbia',
  '12': 'Florida',
  '13': 'Georgia',
  '15': 'Hawaii',
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
  '72': 'Puerto Rico',
};

// Cache for prepared state features
let cachedStateFeatures: StateFeature[] | null = null;

/**
 * Load and prepare state features from us-atlas topology
 * Computes centroids in lon/lat and looks up timezone for each state
 */
export function getStateFeatures(): StateFeature[] {
  if (cachedStateFeatures) {
    return cachedStateFeatures;
  }

  const topology = statesTopology as Topology<{
    states: GeometryCollection<{ name?: string }>;
  }>;

  // Convert topology to GeoJSON features
  const statesGeoJson = feature(topology, topology.objects.states);
  
  const features: StateFeature[] = [];

  for (const feat of statesGeoJson.features) {
    const id = String(feat.id).padStart(2, '0');
    
    // Get state name from properties or FIPS lookup
    const name = (feat.properties?.name as string) || FIPS_TO_NAME[id] || `State ${id}`;

    // Compute centroid in lon/lat (unprojected coordinates)
    // d3.geoCentroid returns [longitude, latitude]
    let centroidLonLat: [number, number] | null = null;
    let tzid: string | null = null;

    try {
      const centroid = geoCentroid(feat as Feature<Geometry>);
      
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
          // Some ocean/boundary centroids may fail
          console.warn(`Could not determine timezone for ${name} at [${centroid[0]}, ${centroid[1]}]`);
        }
      }
    } catch (e) {
      console.warn(`Could not compute centroid for ${name}:`, e);
    }

    features.push({
      id,
      name,
      feature: feat as Feature<Geometry>,
      centroidLonLat,
      tzid,
    });
  }

  // Log a few centroids for verification (should be in lon/lat ranges)
  console.log('Sample state centroids (lon, lat):');
  const samples = features.slice(0, 5);
  for (const s of samples) {
    if (s.centroidLonLat) {
      console.log(`  ${s.name}: [${s.centroidLonLat[0].toFixed(2)}, ${s.centroidLonLat[1].toFixed(2)}] => ${s.tzid}`);
    }
  }

  cachedStateFeatures = features;
  return features;
}

/**
 * Get state name by FIPS code
 */
export function getStateName(fipsCode: string): string {
  const padded = fipsCode.padStart(2, '0');
  return FIPS_TO_NAME[padded] || `State ${fipsCode}`;
}

