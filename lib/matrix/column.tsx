import { Box, Text } from "ink";
import type { MatrixColumn } from "./use-matrix-state.js";

interface CellColor {
  bold?: boolean;
  color: string;
  dimColor?: boolean;
}

function cellStyle(age: number, tailLen: number): CellColor {
  if (age === 0) {
    return { color: "white", bold: true };
  }
  if (age <= 2) {
    return { color: "greenBright" };
  }
  if (age <= Math.floor(tailLen * 0.6)) {
    return { color: "green" };
  }
  return { color: "green", dimColor: true };
}

interface Props extends MatrixColumn {
  rows: number;
}

export default function Column({ cells, ages, tailLen, rows }: Props) {
  return (
    <Box flexDirection="column" width={1}>
      {Array.from({ length: rows }, (_, r) => {
        const char = cells[r];
        const age = ages[r] ?? -1;

        if (char === null || age < 0) {
          return <Text key={r}> </Text>;
        }

        const { color, bold, dimColor } = cellStyle(age, tailLen);
        return (
          <Text bold={bold} color={color} dimColor={dimColor} key={r}>
            {char}
          </Text>
        );
      })}
    </Box>
  );
}
