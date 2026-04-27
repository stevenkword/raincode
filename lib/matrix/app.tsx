import { Box, useApp, useInput, useStdin } from "ink";
import { useEffect } from "react";
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

interface Props {
  config: Config;
}

export default function App({ config }: Props) {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const { columns, terminalRows, terminalCols } = useMatrixState(config);
  const theme = resolveTheme(config.theme, config.color);
  const stops = buildStops(theme.head, theme.base);

  useEffect(() => {
    if (!config.timeout) {
      return;
    }
    const timer = setTimeout(exit, config.timeout * 1000);
    return () => clearTimeout(timer);
  }, [config.timeout, exit]);

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
    </Box>
  );
}
