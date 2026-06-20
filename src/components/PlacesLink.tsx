/**
 * PlacesLink - header button linking to the /places wishlist, with a live count
 */

import { useEffect, useState } from 'react';
import { getPlaces, onPlacesChanged } from '../lib/places';

export function PlacesLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(getPlaces().length);
    update();
    return onPlacesChanged(update);
  }, []);

  return (
    <a className="places-link" href="/places">
      📍 Places to go
      {count > 0 && <span className="places-count">{count}</span>}
    </a>
  );
}
