/**
 * Globe component - Canvas-rendered interactive 3D globe
 *
 * - Orthographic projection (d3-geo), rendered to <canvas> for 60fps interaction
 * - Drag to rotate (mouse or one finger)
 * - Pinch to zoom (two fingers on phone)
 * - Trackpad: two-finger scroll rotates, pinch gesture (ctrl+wheel) zooms
 * - Hover (mouse) or tap (touch) a dot for details; tap again to dismiss
 * - Double-click/double-tap resets the view
 *
 * Rotation/zoom live in refs (not React state) so gestures never re-render
 * the component tree — only the canvas repaints.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { LandGrid } from '../lib/world';
import { getWorldShapes } from '../lib/world';
import type { SunsetData } from '../lib/sun';
import { formatMinutesToHHMM, formatDelta } from '../lib/sun';

interface GlobeProps {
  grid: LandGrid;
  sunset: SunsetData | null;
  /** Precomputed per-point fill colors (recomputed only when the day changes) */
  colors: string[] | null;
}

interface TooltipState {
  index: number;
  x: number;
  y: number;
  pinned: boolean;
}

const RAD = Math.PI / 180;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 10;
const DEFAULT_ROTATION: [number, number] = [0, -20];
const DEFAULT_ZOOM = 1;
// Cursor must be within ~2.2° of a dot to count as hitting it
const PICK_COS_THRESHOLD = Math.cos(2.2 * RAD);

export function Globe({ grid, sunset, colors }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // View state (refs — mutated by gestures, consumed by draw())
  const rotationRef = useRef<[number, number]>([...DEFAULT_ROTATION] as [number, number]);
  const zoomRef = useRef(DEFAULT_ZOOM);
  const sizeRef = useRef(600);
  const projRef = useRef<GeoProjection | null>(null);
  const colorsRef = useRef<string[] | null>(colors);
  const hoverIndexRef = useRef<number | null>(null);

  // Gesture state
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDistRef = useRef(0);
  const movedRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipRef = useRef<TooltipState | null>(null);
  useEffect(() => {
    tooltipRef.current = tooltip;
  }, [tooltip]);

  const shapes = getWorldShapes();

  /* ---------- drawing ---------- */

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = sizeRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const [lambda, phi] = rotationRef.current;
    const radius = (size / 2 - 12) * zoomRef.current;
    const projection = geoOrthographic()
      .rotate([lambda, phi, 0])
      .translate([size / 2, size / 2])
      .scale(radius)
      .clipAngle(90);
    projRef.current = projection;

    const path = geoPath(projection, ctx);

    // Ocean sphere with subtle depth gradient + atmosphere rim
    const grad = ctx.createRadialGradient(
      size / 2 - radius * 0.35,
      size / 2 - radius * 0.45,
      radius * 0.1,
      size / 2,
      size / 2,
      radius
    );
    grad.addColorStop(0, '#16203a');
    grad.addColorStop(0.7, '#0d1426');
    grad.addColorStop(1, '#0a0f1d');
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.fillStyle = grad;
    ctx.fill();

    // Graticule
    ctx.beginPath();
    path(geoGraticule10());
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Land silhouette
    ctx.beginPath();
    path(shapes.land as Parameters<typeof path>[0]);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.07)';
    ctx.fill();

    // Country borders
    ctx.beginPath();
    path(shapes.borders);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Atmosphere rim glow
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.strokeStyle = 'rgba(125, 170, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Dots — only the front hemisphere
    const cols = colorsRef.current;
    if (cols) {
      // View-center unit vector (the point facing the camera)
      const cLon = -lambda * RAD;
      const cLat = -phi * RAD;
      const cx = Math.cos(cLat) * Math.cos(cLon);
      const cy = Math.cos(cLat) * Math.sin(cLon);
      const cz = Math.sin(cLat);

      // Dot size tracks grid spacing (1.2°) on screen
      const dotR = Math.max(0.8, radius * 1.2 * RAD * 0.36);
      const { n, vx, vy, vz, lon, lat } = grid;

      for (let i = 0; i < n; i++) {
        if (vx[i] * cx + vy[i] * cy + vz[i] * cz < 0.03) continue;
        const p = projection([lon[i], lat[i]]);
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(p[0], p[1], dotR, 0, 2 * Math.PI);
        ctx.fillStyle = cols[i];
        ctx.fill();
      }

      // Highlight ring on the hovered/pinned dot
      const hi = hoverIndexRef.current;
      if (hi !== null && vx[hi] * cx + vy[hi] * cy + vz[hi] * cz >= 0.03) {
        const p = projection([lon[hi], lat[hi]]);
        if (p) {
          ctx.beginPath();
          ctx.arc(p[0], p[1], dotR + 2.5, 0, 2 * Math.PI);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
  }, [grid, shapes]);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  // Redraw when colors (i.e. the selected day) change
  useEffect(() => {
    colorsRef.current = colors;
    scheduleDraw();
  }, [colors, scheduleDraw]);

  // Resize handling
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const size = Math.min(container.clientWidth, 760);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = size;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      scheduleDraw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [scheduleDraw]);

  /* ---------- picking ---------- */

  const pickPoint = useCallback(
    (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      const projection = projRef.current;
      if (!canvas || !projection) return null;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Outside the globe disk?
      const size = sizeRef.current;
      const radius = (size / 2 - 12) * zoomRef.current;
      const dx = x - size / 2;
      const dy = y - size / 2;
      if (dx * dx + dy * dy > radius * radius) return null;

      const inverted = projection.invert?.([x, y]);
      if (!inverted) return null;

      const [iLon, iLat] = inverted;
      const cosLat = Math.cos(iLat * RAD);
      const ux = cosLat * Math.cos(iLon * RAD);
      const uy = cosLat * Math.sin(iLon * RAD);
      const uz = Math.sin(iLat * RAD);

      const { n, vx, vy, vz } = grid;
      let best = -1;
      let bestDot = PICK_COS_THRESHOLD;
      for (let i = 0; i < n; i++) {
        const dot = vx[i] * ux + vy[i] * uy + vz[i] * uz;
        if (dot > bestDot) {
          bestDot = dot;
          best = i;
        }
      }
      return best >= 0 ? best : null;
    },
    [grid]
  );

  const showTooltip = useCallback(
    (index: number | null, clientX: number, clientY: number, pinned: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      hoverIndexRef.current = index;
      setTooltip(
        index === null
          ? null
          : {
              index,
              // Keep the tooltip inside the canvas on the right edge
              x: Math.min(clientX - rect.left, sizeRef.current - 200),
              y: clientY - rect.top,
              pinned,
            }
      );
      scheduleDraw();
    },
    [scheduleDraw]
  );

  /* ---------- gestures ---------- */

  const applyRotate = useCallback(
    (dx: number, dy: number) => {
      const size = sizeRef.current;
      const radius = (size / 2 - 12) * zoomRef.current;
      const k = (1 / radius) * (180 / Math.PI) * 0.9;
      const r = rotationRef.current;
      r[0] += dx * k;
      r[1] = Math.max(-89, Math.min(89, r[1] - dy * k));
      scheduleDraw();
    },
    [scheduleDraw]
  );

  const applyZoom = useCallback(
    (factor: number) => {
      zoomRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
      scheduleDraw();
    },
    [scheduleDraw]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = 0;

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchDistRef.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pointers = pointersRef.current;
      const prev = pointers.get(e.pointerId);

      if (!prev) {
        // Plain mouse hover — live tooltip unless one is pinned
        if (e.pointerType === 'mouse' && !tooltipRef.current?.pinned) {
          showTooltip(pickPoint(e.clientX, e.clientY), e.clientX, e.clientY, false);
        }
        return;
      }

      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      movedRef.current += Math.abs(dx) + Math.abs(dy);

      if (pointers.size === 1) {
        applyRotate(dx, dy);
        if (tooltip && !tooltip.pinned) {
          hoverIndexRef.current = null;
          setTooltip(null);
        }
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistRef.current > 0) {
          applyZoom(dist / pinchDistRef.current);
        }
        pinchDistRef.current = dist;
        // Two-finger drag also rotates (use this pointer's half of the motion)
        applyRotate(dx / 2, dy / 2);
      }
    },
    [applyRotate, applyZoom, pickPoint, showTooltip, tooltip]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const wasTap = pointersRef.current.size === 1 && movedRef.current < 8;
      pointersRef.current.delete(e.pointerId);
      pinchDistRef.current = 0;

      if (wasTap) {
        const index = pickPoint(e.clientX, e.clientY);
        const current = tooltipRef.current;
        if (index !== null && (!current?.pinned || current.index !== index)) {
          showTooltip(index, e.clientX, e.clientY, true);
        } else {
          showTooltip(null, 0, 0, false);
        }
      }
    },
    [pickPoint, showTooltip]
  );

  const handlePointerLeave = useCallback(() => {
    if (!tooltipRef.current?.pinned) {
      hoverIndexRef.current = null;
      setTooltip(null);
      scheduleDraw();
    }
  }, [scheduleDraw]);

  // Wheel: trackpad pinch (ctrlKey) zooms, two-finger scroll rotates.
  // Needs a non-passive listener to preventDefault page scroll/zoom.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        applyZoom(Math.exp(-e.deltaY * 0.012));
      } else {
        applyRotate(-e.deltaX, -e.deltaY);
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [applyZoom, applyRotate]);

  const handleDoubleClick = useCallback(() => {
    rotationRef.current = [...DEFAULT_ROTATION] as [number, number];
    zoomRef.current = DEFAULT_ZOOM;
    hoverIndexRef.current = null;
    setTooltip(null);
    scheduleDraw();
  }, [scheduleDraw]);

  /* ---------- tooltip content ---------- */

  const tooltipContent = (() => {
    if (!tooltip || !sunset) return null;
    const i = tooltip.index;
    const mins = sunset.minutes[i];
    const dlt = sunset.delta[i];
    return {
      country: grid.countries[grid.countryIdx[i]],
      coords: `${Math.abs(grid.lat[i]).toFixed(1)}°${grid.lat[i] >= 0 ? 'N' : 'S'}, ${Math.abs(grid.lon[i]).toFixed(1)}°${grid.lon[i] >= 0 ? 'E' : 'W'}`,
      sunset: isNaN(mins) ? 'No sunset (polar)' : formatMinutesToHHMM(mins),
      delta: isNaN(dlt) ? null : dlt,
      tz: grid.tz[grid.tzIdx[i]],
    };
  })();

  return (
    <div className="globe-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="globe-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
      />

      <div className="globe-hint">drag to spin · pinch or scroll to zoom · double-tap to reset</div>

      {tooltip && tooltipContent && (
        <div
          className={`tooltip ${tooltip.pinned ? 'pinned' : ''}`}
          style={{
            left: tooltip.x + 14,
            top: tooltip.y + 14,
          }}
        >
          <div className="tooltip-name">{tooltipContent.country}</div>
          <div className="tooltip-coords">{tooltipContent.coords}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Sunset</span>
            <span className="tooltip-value">{tooltipContent.sunset}</span>
          </div>
          {tooltipContent.delta !== null && (
            <div className="tooltip-row">
              <span className="tooltip-label">vs world avg</span>
              <span
                className={`tooltip-value ${tooltipContent.delta > 0 ? 'later' : 'earlier'}`}
              >
                {formatDelta(tooltipContent.delta)}
              </span>
            </div>
          )}
          <div className="tooltip-row">
            <span className="tooltip-label">Zone</span>
            <span className="tooltip-value tooltip-tz">{tooltipContent.tz}</span>
          </div>
        </div>
      )}
    </div>
  );
}
