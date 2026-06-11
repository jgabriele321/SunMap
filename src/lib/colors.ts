/**
 * Color utilities for mapping sunset deltas to colors
 *
 * Diverging palette designed for a dark background:
 * - Earlier than average  => bright sky blue deepening to vivid indigo-blue
 * - Later than average    => warm amber deepening to rose red
 * - Near average          => pale neutral
 * - No sunset (polar)     => dim slate
 */

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [128, 128, 128];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export const COLORS = {
  deepCool: '#3b4fd8', // vivid indigo-blue (earliest)
  nearCool: '#7dd3fc', // light sky blue
  neutral: '#e8e6df',  // pale warm gray (at average)
  nearWarm: '#fbbf24', // amber
  deepWarm: '#f43f5e', // rose red (latest)
  invalid: '#3d4654',  // dim slate — polar day/night, no sunset
};

/**
 * Map a delta (minutes vs global average) to a color.
 * @param delta - Minutes vs average (NaN = no sunset)
 * @param scaleMax - Normalization scale (p95 of |delta|)
 */
export function colorForDelta(delta: number, scaleMax: number): string {
  if (isNaN(delta) || scaleMax === 0) return COLORS.invalid;

  const t = Math.max(-1, Math.min(1, delta / scaleMax));
  const absT = Math.abs(t);
  const KNEE = 0.3;

  if (t < 0) {
    return absT < KNEE
      ? interpolateColor(COLORS.neutral, COLORS.nearCool, absT / KNEE)
      : interpolateColor(COLORS.nearCool, COLORS.deepCool, (absT - KNEE) / (1 - KNEE));
  }
  return absT < KNEE
    ? interpolateColor(COLORS.neutral, COLORS.nearWarm, absT / KNEE)
    : interpolateColor(COLORS.nearWarm, COLORS.deepWarm, (absT - KNEE) / (1 - KNEE));
}

/**
 * CSS gradient stops for the legend bar (earlier → later)
 */
export function legendGradient(): string {
  return `linear-gradient(to right,
    ${COLORS.deepCool} 0%,
    ${COLORS.nearCool} 30%,
    ${COLORS.neutral} 50%,
    ${COLORS.nearWarm} 70%,
    ${COLORS.deepWarm} 100%)`;
}
