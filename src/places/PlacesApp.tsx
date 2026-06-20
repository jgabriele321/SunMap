/**
 * PlacesApp - the /places wishlist page
 *
 * Shows every place added from the globe views in chronological order
 * (oldest first), with the country, coordinates, and when it was added.
 * Each row can be removed; the whole list can be cleared.
 */

import { useEffect, useState } from 'react';
import { getPlaces, removePlace, clearPlaces, onPlacesChanged, type Place } from '../lib/places';
import '../App.css';

function fmtCoords(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PlacesApp() {
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    document.title = 'SunMap — Places to go';
    const update = () => setPlaces(getPlaces().slice().sort((a, b) => a.addedAt - b.addedAt));
    update();
    return onPlacesChanged(update);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <a className="places-link" href="/">
          ← Back to globe
        </a>
        <h1>
          <span className="logo-mark">📍</span> Places to go
        </h1>
        <p className="app-subtitle">
          {places.length === 0
            ? 'Your saved spots will appear here'
            : `${places.length} ${places.length === 1 ? 'place' : 'places'}, in the order you added them`}
        </p>
      </header>

      <main className="app-main">
        {places.length === 0 ? (
          <div className="places-empty">
            <p>No places yet.</p>
            <p>
              Open the <a href="/">sunset</a> or <a href="/temp">temperature</a> globe,
              tap a dot, and hit <strong>“+ Add to list”</strong>.
            </p>
          </div>
        ) : (
          <>
            <ol className="places-list">
              {places.map((p, i) => (
                <li className="place-row" key={p.id}>
                  <span className="place-index">{i + 1}</span>
                  <div className="place-main">
                    <span className="place-country">{p.country}</span>
                    <span className="place-coords">{fmtCoords(p.lat, p.lon)}</span>
                  </div>
                  <span className="place-date">{fmtDate(p.addedAt)}</span>
                  <button
                    className="place-remove"
                    aria-label={`Remove ${p.country}`}
                    onClick={() => removePlace(p.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>

            <button
              className="places-clear"
              onClick={() => {
                if (confirm('Clear all saved places?')) clearPlaces();
              }}
            >
              Clear all
            </button>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          <a href="/">🌅 sunset</a> · <a href="/temp">🌡 temperature</a> ·{' '}
          <a href="/USA">US county view</a>
        </p>
      </footer>
    </div>
  );
}

export default PlacesApp;
