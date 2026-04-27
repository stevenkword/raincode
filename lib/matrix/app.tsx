import { Box, Text, useApp, useInput, useStdin } from "ink";
import { useEffect, useState } from "react";
import Column from "./column.js";
import type { Config } from "./config.js";
import { buildStops, resolveTheme } from "./theme.js";
import { useMatrixState } from "./use-matrix-state.js";

function InputHandler() {
  const { exit } = useApp();
  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
  });
  return null;
}

interface CountdownProps {
  color: string;
  seconds: number;
}

function Countdown({ seconds, color }: CountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  const { exit } = useApp();

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          exit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [exit]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  return (
    <Box bottom={0} position="absolute" right={0}>
      <Text color={color} dimColor>
        {mins}:{secs}
      </Text>
    </Box>
  );
}

interface Props {
  config: Config;
}

export default function App({ config }: Props) {
  const { isRawModeSupported } = useStdin();
  const { columns, terminalRows, terminalCols } = useMatrixState(config);
  const theme = resolveTheme(config.theme, config.color);
  const stops = buildStops(theme.head, theme.base);

  return (
    <Box flexDirection="row" height={terminalRows} width={terminalCols}>
      {isRawModeSupported && <InputHandler />}
      {columns.map((col, i) => (
        <Column
          ages={col.ages}
          cells={col.cells}
          flashes={col.flashes}
          key={i}
          rows={terminalRows}
          stops={stops}
          tailLen={col.tailLen}
        />
      ))}
      {config.timeout && (
        <Countdown color={theme.base} seconds={config.timeout} />
      )}
    </Box>
  );
}
