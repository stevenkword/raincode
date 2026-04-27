import { useAnimation, useWindowSize } from "ink";
import { useCallback, useEffect, useState } from "react";
import { randomChar } from "./chars.js";
import { useMessageQueue } from "./use-message-queue.js";

const MUTATION_RATE = 0.04;
const FLASH_PROB = 0.005;
const MESSAGE_PROB = 0.05; // probability a restarting column claims the next message
const MAX_MESSAGE_COLS = 2; // at most this many columns spell out a message at once

interface MessageState {
  chars: string[];
  pos: number;
}

interface ColumnState {
  ages: number[];
  cells: (string | null)[];
  flashes: number[];
  head: number;
  headAcc: number;
  message: MessageState | null;
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
    message: null,
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
): { head: number; headAcc: number; message: MessageState | null } {
  let { head, headAcc } = col;
  let message = col.message;
  headAcc += col.speed;

  while (headAcc >= 1) {
    head++;
    headAcc--;
    if (head >= 0 && head < rows) {
      if (message !== null && message.pos < message.chars.length) {
        cells[head] = message.chars[message.pos] ?? randomChar();
        message = { chars: message.chars, pos: message.pos + 1 };
      } else {
        cells[head] = randomChar();
        if (message !== null) {
          message = null; // message exhausted
        }
      }
      ages[head] = 0;
      flashes[head] = 0;
    }
  }

  return { head, headAcc, message };
}

function tickColumn(
  col: ColumnState,
  rows: number,
  nextMessage?: string
): ColumnState {
  if (col.restartIn > 0) {
    const newRestartIn = col.restartIn - 1;
    // Claim the message at the last countdown tick so it's ready when rain starts
    if (newRestartIn === 0 && nextMessage !== undefined) {
      return {
        ...col,
        restartIn: 0,
        message: { chars: [...nextMessage], pos: 0 },
      };
    }
    return { ...col, restartIn: newRestartIn };
  }

  const newAges = col.ages.map((age) => (age >= 0 ? age + 1 : -1));
  const newCells = [...col.cells];
  const newFlashes = col.flashes.map((f) => Math.max(0, f - 1));

  expireCells(newAges, newCells, newFlashes, col.tailLen, rows);
  mutateCells(newAges, newCells, rows);
  applyFlashBurst(newAges, newFlashes);

  const { head, headAcc, message } = advanceHead(
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
      message: null,
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
    message,
  };
}

export function useMatrixState() {
  const { columns, rows } = useWindowSize();
  const { frame } = useAnimation({ interval: 50 });
  const { dequeue, hasMessages } = useMessageQueue();

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

  const tick = useCallback(
    (prev: ColumnState[]) => {
      const activeMessages = prev.filter((c) => c.message !== null).length;
      return prev.map((col) => {
        const canClaim =
          hasMessages &&
          activeMessages < MAX_MESSAGE_COLS &&
          col.restartIn === 1 &&
          Math.random() < MESSAGE_PROB;
        return tickColumn(col, rows, canClaim ? dequeue() : undefined);
      });
    },
    [rows, dequeue, hasMessages]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: frame is an intentional tick trigger
  useEffect(() => {
    setCols(tick);
  }, [frame, tick]);

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
