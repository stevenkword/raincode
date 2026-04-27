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
  tailLens,
  rows,
  stops,
}: Props) {
  const flashColor = stops[1]?.[1];
  const flashHex = flashColor
    ? `#${flashColor[0].toString(16).padStart(2, "0")}${flashColor[1].toString(16).padStart(2, "0")}${flashColor[2].toString(16).padStart(2, "0")}`
    : "#88ff88";

  return (
    <Box flexDirection="column" width={1}>
      {Array.from({ length: rows }, (_, r) => {
        const char = cells[r];
        const age = ages[r] ?? -1;

        if (char === null || age < 0) {
          return <Text key={r}> </Text>;
        }

        const flashing = (flashes[r] ?? 0) > 0;
        const color = flashing
          ? flashHex
          : phosphorColor(age, tailLens[r] ?? 12, stops);
        return (
          <Text bold={age === 0} color={color} key={r}>
            {char}
          </Text>
        );
      })}
    </Box>
  );
}
