/**
 * useDotList - bridges the land grid to the places store for a Globe.
 *
 * Returns `isInList(index)` and `toggle(index)` callbacks that translate a
 * grid dot index into a Place (country + coords) and check/toggle it.
 */

import { useCallback } from 'react';
import type { LandGrid } from './world';
import { placeId, isInList as storeHas, togglePlace } from './places';

export function useDotList(grid: LandGrid) {
  const isInList = useCallback(
    (i: number) => storeHas(placeId(grid.lat[i], grid.lon[i])),
    [grid]
  );

  const toggle = useCallback(
    (i: number) => {
      togglePlace({
        id: placeId(grid.lat[i], grid.lon[i]),
        country: grid.countries[grid.countryIdx[i]],
        lat: grid.lat[i],
        lon: grid.lon[i],
      });
    },
    [grid]
  );

  return { isInList, toggle };
}
