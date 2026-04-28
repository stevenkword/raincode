export type RGB = readonly [number, number, number];
export type GradientStops = readonly [number, RGB][];

export interface Theme {
  base: string;
  head: string;
}

export const THEMES: Record<string, Theme> = {
  classic: { head: "#ffffff", base: "#00ff41" },
  blue: { head: "#ffffff", base: "#4488ff" },
  red: { head: "#ffffff", base: "#ff2200" },
  architect: { head: "#ffffff", base: "#ffffff" },
  amber: { head: "#ffffff", base: "#ffaa00" },
};

const WHITE: RGB = [255, 255, 255];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function scaleRgb(c: RGB, s: number): RGB {
  return [Math.round(c[0] * s), Math.round(c[1] * s), Math.round(c[2] * s)];
}

function rgbToHex([r, g, b]: RGB): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function buildStops(headHex: string, baseHex: string): GradientStops {
  const head = hexToRgb(headHex);
  const base = hexToRgb(baseHex);
  return [
    [0.0, head], // head — white
    [0.02, lerpRgb(WHITE, base, 0.3)], // one-cell transition to green
    [0.08, base], // full saturation by cell 2
    [0.45, scaleRgb(base, 0.65)], // hold brightness through mid-tail
    [0.7, scaleRgb(base, 0.35)], // start fading — 8–12 chars still visible
    [0.88, scaleRgb(base, 0.12)], // near-invisible
    [1.0, scaleRgb(base, 0.05)], // ghost trace
  ];
}

export function phosphorColor(
  age: number,
  tailLen: number,
  stops: GradientStops
): string {
  const t = Math.min(age / tailLen, 1);
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i] as [number, RGB];
    const [p1, c1] = stops[i + 1] as [number, RGB];
    if (t >= p0 && t <= p1) {
      const s = (t - p0) / (p1 - p0);
      return rgbToHex(lerpRgb(c0, c1, s));
    }
  }
  return rgbToHex((stops.at(-1)?.[1] ?? [0, 51, 17]) as RGB);
}

export function resolveTheme(themeName: string, colorOverride?: string): Theme {
  const theme = THEMES[themeName] ?? (THEMES.classic as Theme);
  return colorOverride ? { ...theme, base: colorOverride } : theme;
}
