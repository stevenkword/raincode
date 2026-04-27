import { Box, Text } from "ink";
import type { MatrixColumn } from "./use-matrix-state.js";

type RGB = readonly [number, number, number];

// Phosphor gradient stops: [0–1 position, RGB]
// Matches the film's characteristic white head → pale phosphor → matrix green → dark fade
const STOPS: readonly [number, RGB][] = [
  [0.0, [0xff, 0xff, 0xff]], // head: pure white
  [0.05, [0xcc, 0xff, 0xcc]], // near-head: pale phosphor
  [0.15, [0x00, 0xff, 0x41]], // classic matrix green
  [0.6, [0x00, 0xcc, 0x33]], // mid green
  [0.85, [0x00, 0x77, 0x22]], // dim green
  [1.0, [0x00, 0x33, 0x11]], // near-fade
];

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function phosphorColor(age: number, tailLen: number): string {
  const t = Math.min(age / tailLen, 1);
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [p0, c0] = STOPS[i] as [number, RGB];
    const [p1, c1] = STOPS[i + 1] as [number, RGB];
    if (t >= p0 && t <= p1) {
      const s = (t - p0) / (p1 - p0);
      const r = lerpChannel(c0[0], c1[0], s).toString(16).padStart(2, "0");
      const g = lerpChannel(c0[1], c1[1], s).toString(16).padStart(2, "0");
      const b = lerpChannel(c0[2], c1[2], s).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
  }
  return "#003311";
}

const FLASH_COLOR = "#88ff88";

interface Props extends MatrixColumn {
  rows: number;
}

export default function Column({ cells, ages, flashes, tailLen, rows }: Props) {
  return (
    <Box flexDirection="column" width={1}>
      {Array.from({ length: rows }, (_, r) => {
        const char = cells[r];
        const age = ages[r] ?? -1;

        if (char === null || age < 0) {
          return <Text key={r}> </Text>;
        }

        const flashing = (flashes[r] ?? 0) > 0;
        const color = flashing ? FLASH_COLOR : phosphorColor(age, tailLen);
        return (
          <Text bold={age === 0} color={color} key={r}>
            {char}
          </Text>
        );
      })}
    </Box>
  );
}
