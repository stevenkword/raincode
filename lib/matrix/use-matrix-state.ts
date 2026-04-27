import { useAnimation, useWindowSize } from "ink";
import { useEffect, useState } from "react";
import { randomChar } from "./chars.js";

const MUTATION_RATE = 0.04; // probability a tail cell re-rolls its glyph each tick
const FLASH_PROB = 0.005; // probability per column per tick of a burst flash

interface ColumnState {
  ages: number[];
  cells: (string | null)[];
  flashes: number[]; // per-cell countdown (ticks remaining); 0 = not flashing
  head: number;
  headAcc: number;
  restartIn: number;
  speed: number;
  tailLen: number;
}

export interface MatrixColumn {
  ages: number[];
  cells: (string | null)[];
  flashes: number[];
  tailLen: number;
}

function makeColumn(rows: number, initialDelay: number): ColumnState {
  return {
    cells: new Array<string | null>(rows).fill(null),
    ages: new Array<number>(rows).fill(-1),
    flashes: new Array<number>(rows).fill(0),
    head: -1,
    headAcc: 0,
    speed: 0.3 + Math.random() * 0.7,
    tailLen: 8 + Math.floor(Math.random() * 12),
    restartIn: initialDelay,
  };
}

function expireCells(
  ages: number[],
  cells: (string | null)[],
  flashes: number[],
  tailLen: number,
  rows: number
): void {
  for (let r = 0; r < rows; r++) {
    if ((ages[r] ?? -1) > tailLen) {
      ages[r] = -1;
      cells[r] = null;
      flashes[r] = 0;
    }
  }
}

function mutateCells(
  ages: number[],
  cells: (string | null)[],
  rows: number
): void {
  for (let r = 0; r < rows; r++) {
    if (
      (ages[r] ?? -1) > 0 &&
      cells[r] !== null &&
      Math.random() < MUTATION_RATE
    ) {
      cells[r] = randomChar();
    }
  }
}

function applyFlashBurst(ages: number[], flashes: number[]): void {
  if (Math.random() >= FLASH_PROB) {
    return;
  }
  const activeTail = ages.reduce<number[]>((acc, age, r) => {
    if ((age ?? -1) > 0) {
      acc.push(r);
    }
    return acc;
  }, []);
  if (activeTail.length > 0) {
    const target = activeTail[
      Math.floor(Math.random() * activeTail.length)
    ] as number;
    flashes[target] = 2;
  }
}

function advanceHead(
  col: ColumnState,
  cells: (string | null)[],
  ages: number[],
  flashes: number[],
  rows: number
): { head: number; headAcc: number } {
  let { head, headAcc } = col;
  headAcc += col.speed;
  while (headAcc >= 1) {
    head++;
    headAcc--;
    if (head >= 0 && head < rows) {
      cells[head] = randomChar();
      ages[head] = 0;
      flashes[head] = 0;
    }
  }
  return { head, headAcc };
}

function tickColumn(col: ColumnState, rows: number): ColumnState {
  if (col.restartIn > 0) {
    return { ...col, restartIn: col.restartIn - 1 };
  }

  const newAges = col.ages.map((age) => (age >= 0 ? age + 1 : -1));
  const newCells = [...col.cells];
  const newFlashes = col.flashes.map((f) => Math.max(0, f - 1));

  expireCells(newAges, newCells, newFlashes, col.tailLen, rows);
  mutateCells(newAges, newCells, rows);
  applyFlashBurst(newAges, newFlashes);

  const { head, headAcc } = advanceHead(
    col,
    newCells,
    newAges,
    newFlashes,
    rows
  );

  const anyActive = newAges.some((a) => a >= 0);
  if (head >= rows && !anyActive) {
    return {
      ...col,
      cells: new Array<string | null>(rows).fill(null),
      ages: new Array<number>(rows).fill(-1),
      flashes: new Array<number>(rows).fill(0),
      head: -1,
      headAcc: 0,
      restartIn: Math.floor(Math.random() * 50) + 10,
    };
  }

  return {
    ...col,
    cells: newCells,
    ages: newAges,
    flashes: newFlashes,
    head,
    headAcc,
  };
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
        flashes: col.flashes,
        tailLen: col.tailLen,
      })
    ),
    terminalRows: rows,
    terminalCols: columns,
  };
}
