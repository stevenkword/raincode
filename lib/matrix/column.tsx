import { Box, Text } from "ink";
import { type GradientStops, phosphorColor } from "./theme.js";
import type { MatrixColumn } from "./use-matrix-state.js";

interface Props extends MatrixColumn {
  rows: number;
  stops: GradientStops;
}

export default function Column({
  cells,
  ages,
  flashes,
  glows,
  tailLens,
  rows,
  stops,
}: Props) {
  const headColor = stops[0]?.[1];
  const flashHex = headColor
    ? `#${headColor[0].toString(16).padStart(2, "0")}${headColor[1].toString(16).padStart(2, "0")}${headColor[2].toString(16).padStart(2, "0")}`
    : "#ffffff";
  const glowColor = stops[1]?.[1];
  const glowHex = glowColor
    ? `#${glowColor[0].toString(16).padStart(2, "0")}${glowColor[1].toString(16).padStart(2, "0")}${glowColor[2].toString(16).padStart(2, "0")}`
    : "#ccffcc";

  return (
    <Box flexDirection="column" width={1}>
      {Array.from({ length: rows }, (_, r) => {
        const char = cells[r];
        const age = ages[r] ?? -1;

        if (char === null || age < 0) {
          return <Text key={r}> </Text>;
        }

        const flashing = (flashes[r] ?? 0) > 0;
        const glowing = (glows[r] ?? 0) > 0;
        let color = phosphorColor(age, tailLens[r] ?? 12, stops);
        if (glowing) {
          color = glowHex;
        }
        if (flashing) {
          color = flashHex;
        }
        return (
          <Text bold={age === 0} color={color} key={r}>
            {char}
          </Text>
        );
      })}
    </Box>
  );
}
