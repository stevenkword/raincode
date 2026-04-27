import { useAnimation, useWindowSize } from "ink";
import { useEffect, useState } from "react";
import { randomChar } from "./chars.js";

interface ColumnState {
  ages: number[];
  cells: (string | null)[];
  head: number;
  headAcc: number;
  restartIn: number;
  speed: number;
  tailLen: number;
}

export interface MatrixColumn {
  ages: number[];
  cells: (string | null)[];
  tailLen: number;
}

function makeColumn(rows: number, initialDelay: number): ColumnState {
  return {
    cells: new Array<string | null>(rows).fill(null),
    ages: new Array<number>(rows).fill(-1),
    head: -1,
    headAcc: 0,
    speed: 0.3 + Math.random() * 0.7,
    tailLen: 8 + Math.floor(Math.random() * 12),
    restartIn: initialDelay,
  };
}

function tickColumn(col: ColumnState, rows: number): ColumnState {
  if (col.restartIn > 0) {
    return { ...col, restartIn: col.restartIn - 1 };
  }

  const newAges = col.ages.map((age) => (age >= 0 ? age + 1 : -1));
  const newCells = [...col.cells];

  for (let r = 0; r < rows; r++) {
    if ((newAges[r] ?? -1) > col.tailLen) {
      newAges[r] = -1;
      newCells[r] = null;
    }
  }

  let { head, headAcc } = col;
  headAcc += col.speed;

  while (headAcc >= 1) {
    head++;
    headAcc--;
    if (head >= 0 && head < rows) {
      newCells[head] = randomChar();
      newAges[head] = 0;
    }
  }

  const anyActive = newAges.some((a) => a >= 0);
  if (head >= rows && !anyActive) {
    return {
      ...col,
      cells: new Array<string | null>(rows).fill(null),
      ages: new Array<number>(rows).fill(-1),
      head: -1,
      headAcc: 0,
      restartIn: Math.floor(Math.random() * 50) + 10,
    };
  }

  return { ...col, cells: newCells, ages: newAges, head, headAcc };
}

export function useMatrixState() {
  const { columns, rows } = useWindowSize();
  const { frame } = useAnimation({ interval: 50 });

  const [cols, setCols] = useState<ColumnState[]>(() =>
    Array.from({ length: columns }, () =>
      makeColumn(rows, Math.floor(Math.random() * columns))
    )
  );

  useEffect(() => {
    setCols(
      Array.from({ length: columns }, () =>
        makeColumn(rows, Math.floor(Math.random() * 20))
      )
    );
  }, [columns, rows]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: frame is an intentional tick trigger
  useEffect(() => {
    setCols((prev) => prev.map((col) => tickColumn(col, rows)));
  }, [frame, rows]);

  return {
    columns: cols.map(
      (col): MatrixColumn => ({
        cells: col.cells,
        ages: col.ages,
        tailLen: col.tailLen,
      })
    ),
    terminalRows: rows,
    terminalCols: columns,
  };
}
