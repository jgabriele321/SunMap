/**
 * Places-to-go list — a small wishlist of dots, saved in localStorage so it
 * persists across visits and is shared by the sunset and temperature views.
 *
 * A place is identified by its rounded lon/lat, so the same spot toggles
 * consistently regardless of which view added it.
 */

export interface Place {
  id: string;
  country: string;
  lat: number;
  lon: number;
  /** ms epoch when added — list is shown oldest-first (chronological) */
  addedAt: number;
}

const KEY = 'sunmap-places';
const EVENT = 'sunmap-places-changed';

export function placeId(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

export function getPlaces(): Place[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Place[]) : [];
  } catch {
    return [];
  }
}

function save(places: Place[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(places));
  } catch {
    /* ignore quota / private-mode errors */
  }
  // Notify in-page listeners (the 'storage' event only fires in other tabs)
  window.dispatchEvent(new Event(EVENT));
}

export function isInList(id: string): boolean {
  return getPlaces().some((p) => p.id === id);
}

export function addPlace(p: Omit<Place, 'addedAt'>): void {
  const places = getPlaces();
  if (places.some((x) => x.id === p.id)) return;
  places.push({ ...p, addedAt: Date.now() });
  save(places);
}

export function removePlace(id: string): void {
  save(getPlaces().filter((p) => p.id !== id));
}

/** Toggle a place; returns true if it is now in the list */
export function togglePlace(p: Omit<Place, 'addedAt'>): boolean {
  if (isInList(p.id)) {
    removePlace(p.id);
    return false;
  }
  addPlace(p);
  return true;
}

export function clearPlaces(): void {
  save([]);
}

/** Subscribe to list changes (same tab + cross-tab). Returns an unsubscribe fn. */
export function onPlacesChanged(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
