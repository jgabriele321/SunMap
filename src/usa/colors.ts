/**
 * Color utilities for mapping sunset deltas to colors
 * 
 * Color scheme:
 * - Later than average (positive delta) => warm colors (orange to red)
 * - Earlier than average (negative delta) => cool colors (light blue to deep blue)
 * - Near average => near white/neutral tones
 */

/**
 * Parse a hex color string to RGB components
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return [128, 128, 128]; // Default gray
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * Convert RGB components to hex string
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(c)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Linearly interpolate between two colors
 * @param color1 - Start color (hex)
 * @param color2 - End color (hex)
 * @param t - Interpolation factor (0 = color1, 1 = color2)
 */
function interpolateColor(color1: string, color2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);
  
  const r = r1 + (r2 - r1) * t;
  const g = g1 + (g2 - g1) * t;
  const b = b1 + (b2 - b1) * t;
  
  return rgbToHex(r, g, b);
}

// Color palette
const COLORS = {
  // Cool colors (earlier sunset)
  deepCool: '#001f5b',     // Deep midnight blue (most early)
  nearCool: '#a6d8ff',     // Light blue (slightly early)
  
  // Warm colors (later sunset)
  nearWarm: '#ffd27d',     // Light orange/gold (slightly late)
  deepWarm: '#b30000',     // Deep red (most late)
  
  // Neutral
  neutral: '#f5f5dc',      // Off-white/beige (at average)
  
  // Invalid state
  invalid: '#888888',      // Gray for no data
};

/**
 * Get color for a given delta from average
 * 
 * @param delta - Minutes difference from national average (positive = later)
 * @param maxAbsDelta - Maximum absolute delta for normalization
 * @returns Hex color string
 */
export function colorForDelta(
  delta: number | null,
  maxAbsDelta: number
): string {
  // Handle invalid/null cases
  if (delta === null || maxAbsDelta === 0) {
    return COLORS.invalid;
  }

  // Normalize delta to range [-1, 1]
  const t = Math.max(-1, Math.min(1, delta / maxAbsDelta));

  if (t < 0) {
    // Earlier than average: interpolate from neutral (t=0) to cool colors (t=-1)
    // As t goes from 0 to -1, we go from nearCool to deepCool
    const absT = Math.abs(t);
    
    // First half: neutral to nearCool
    // Second half: nearCool to deepCool
    if (absT < 0.3) {
      // Very near average - blend neutral to nearCool
      return interpolateColor(COLORS.neutral, COLORS.nearCool, absT / 0.3);
    } else {
      // Further from average - blend nearCool to deepCool
      const innerT = (absT - 0.3) / 0.7;
      return interpolateColor(COLORS.nearCool, COLORS.deepCool, innerT);
    }
  } else {
    // Later than average: interpolate from neutral (t=0) to warm colors (t=1)
    if (t < 0.3) {
      // Very near average - blend neutral to nearWarm
      return interpolateColor(COLORS.neutral, COLORS.nearWarm, t / 0.3);
    } else {
      // Further from average - blend nearWarm to deepWarm
      const innerT = (t - 0.3) / 0.7;
      return interpolateColor(COLORS.nearWarm, COLORS.deepWarm, innerT);
    }
  }
}

/**
 * Get the color palette for the legend
 */
export function getLegendColors(): {
  deepCool: string;
  nearCool: string;
  neutral: string;
  nearWarm: string;
  deepWarm: string;
} {
  return COLORS;
}

