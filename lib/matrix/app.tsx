import { Box, useApp, useInput, useStdin } from "ink";
import Column from "./column.js";
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

export default function App() {
  const { isRawModeSupported } = useStdin();
  const { columns, terminalRows, terminalCols } = useMatrixState();

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
          tailLen={col.tailLen}
        />
      ))}
    </Box>
  );
}
