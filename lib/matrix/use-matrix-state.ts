import { useAnimation, useWindowSize } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import { randomChar } from "./chars.js";
import type { Config } from "./config.js";
import { useMessageQueue } from "./use-message-queue.js";

const MUTATION_RATE = 0.04;
const FLASH_PROB = 0.005;
const MESSAGE_PROB = 0.05;
const MAX_MESSAGE_COLS = 2;
const MAX_STREAMS = 2;
const SECOND_STREAM_THRESHOLD = 0.3;
const SECOND_STREAM_PROB = 0.003;

const SPEED_STEP = 0.25;
const SPEED_MIN = 0.1;
const SPEED_MAX = 5.0;

interface MessageState {
  chars: string[];
  pos: number;
}

interface StreamState {
  head: number;
  headAcc: number;
  message: MessageState | null;
  restartIn: number;
  speed: number;
  tailLen: number;
}

interface ColumnState {
  ages: number[];
  cells: (string | null)[];
  dissolves: number[];
  flashes: number[];
  streams: StreamState[];
  tailLens: number[];
}

export interface MatrixColumn {
  ages: number[];
  cells: (string | null)[];
  flashes: number[];
  tailLens: number[];
}

function randomSpeed(multiplier: number): number {
  const fast = Math.random() < 0.1;
  const base = fast ? 1.5 + Math.random() * 1.5 : 0.3 + Math.random() * 0.5;
  return base * multiplier;
}

function makeStream(
  initialDelay: number,
  speedMultiplier: number
): StreamState {
  return {
    head: -1,
    headAcc: 0,
    message: null,
    restartIn: initialDelay,
    speed: randomSpeed(speedMultiplier),
    tailLen: 8 + Math.floor(Math.random() * 12),
  };
}

function makeColumn(
  rows: number,
  initialDelay: number,
  speedMultiplier: number,
  density: number
): ColumnState {
  const dormant = Math.random() > density;
  return {
    ages: new Array<number>(rows).fill(-1),
    cells: new Array<string | null>(rows).fill(null),
    dissolves: new Array<number>(rows).fill(0),
    flashes: new Array<number>(rows).fill(0),
    tailLens: new Array<number>(rows).fill(12),
    streams: [makeStream(dormant ? 99_999 : initialDelay, speedMultiplier)],
  };
}

function expireCells(
  ages: number[],
  cells: (string | null)[],
  flashes: number[],
  dissolves: number[],
  tailLens: number[],
  rows: number
): void {
  for (let r = 0; r < rows; r++) {
    if ((ages[r] ?? -1) > (tailLens[r] ?? 12) && (dissolves[r] ?? 0) === 0) {
      ages[r] = -1;
      cells[r] = null;
      flashes[r] = 0;
    }
  }
}

function mutateCells(
  ages: number[],
  cells: (string | null)[],
  dissolves: number[],
  rows: number
): void {
  for (let r = 0; r < rows; r++) {
    if ((ages[r] ?? -1) < 0 || cells[r] === null) {
      continue;
    }
    const dissolve = dissolves[r] ?? 0;
    if (dissolve > 0) {
      cells[r] = randomChar();
      dissolves[r] = dissolve - 1;
    } else if ((ages[r] ?? -1) > 0 && Math.random() < MUTATION_RATE) {
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
  stream: StreamState,
  cells: (string | null)[],
  ages: number[],
  flashes: number[],
  tailLens: number[],
  dissolves: number[],
  rows: number
): {
  head: number;
  headAcc: number;
  justExhaustedMessage: boolean;
  message: MessageState | null;
} {
  let { head, headAcc } = stream;
  let { message } = stream;
  let justExhaustedMessage = false;
  headAcc += stream.speed;

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
          message = null;
          justExhaustedMessage = true;
        }
      }
      ages[head] = 0;
      flashes[head] = 0;
      tailLens[head] = stream.tailLen;
      dissolves[head] = 0;
    }
  }

  return { head, headAcc, message, justExhaustedMessage };
}

function tickStream(
  stream: StreamState,
  cells: (string | null)[],
  ages: number[],
  flashes: number[],
  tailLens: number[],
  dissolves: number[],
  rows: number,
  nextMessage?: string
): StreamState {
  if (stream.restartIn > 0) {
    const newRestartIn = stream.restartIn - 1;
    if (newRestartIn === 0 && nextMessage !== undefined) {
      return {
        ...stream,
        restartIn: 0,
        message: { chars: [...nextMessage], pos: 0 },
      };
    }
    return { ...stream, restartIn: newRestartIn };
  }

  const { head, headAcc, message, justExhaustedMessage } = advanceHead(
    stream,
    cells,
    ages,
    flashes,
    tailLens,
    dissolves,
    rows
  );

  if (justExhaustedMessage) {
    for (let r = 0; r < rows; r++) {
      if (
        (ages[r] ?? -1) >= 0 &&
        cells[r] !== null &&
        (dissolves[r] ?? 0) === 0
      ) {
        dissolves[r] = 3 + Math.floor(Math.random() * 3);
      }
    }
  }

  if (head >= rows + stream.tailLen) {
    return {
      ...stream,
      head: -1,
      headAcc: 0,
      message: null,
      restartIn: Math.floor(Math.random() * 50) + 10,
      tailLen: 8 + Math.floor(Math.random() * 12),
    };
  }

  return { ...stream, head, headAcc, message };
}

function tickColumn(
  col: ColumnState,
  rows: number,
  speedMultiplier: number,
  nextMessage?: string
): ColumnState {
  const newAges = col.ages.map((age) => (age >= 0 ? age + 1 : -1));
  const newCells = [...col.cells];
  const newFlashes = col.flashes.map((f) => Math.max(0, f - 1));
  const newDissolves = [...col.dissolves];
  const newTailLens = [...col.tailLens];

  expireCells(newAges, newCells, newFlashes, newDissolves, newTailLens, rows);
  mutateCells(newAges, newCells, newDissolves, rows);
  applyFlashBurst(newAges, newFlashes);

  const newStreams = col.streams.map((stream, i) =>
    tickStream(
      stream,
      newCells,
      newAges,
      newFlashes,
      newTailLens,
      newDissolves,
      rows,
      i === 0 ? nextMessage : undefined
    )
  );

  // Secondary streams are ephemeral — remove them once they complete (restartIn > 0 means just reset)
  const filteredStreams = newStreams.filter(
    (s, i) => i === 0 || s.restartIn === 0
  );

  // Possibly spawn a second stream once the primary is far enough down
  const primary = filteredStreams[0];
  if (
    filteredStreams.length < MAX_STREAMS &&
    primary !== undefined &&
    primary.restartIn === 0 &&
    primary.head >= Math.floor(rows * SECOND_STREAM_THRESHOLD) &&
    primary.head < rows &&
    Math.random() < SECOND_STREAM_PROB
  ) {
    filteredStreams.push(makeStream(0, speedMultiplier));
  }

  return {
    ...col,
    ages: newAges,
    cells: newCells,
    dissolves: newDissolves,
    flashes: newFlashes,
    streams: filteredStreams,
    tailLens: newTailLens,
  };
}

export function useMatrixState(config: Config) {
  const { columns, rows } = useWindowSize();
  const { frame } = useAnimation({ interval: 50 });
  const { dequeue, hasMessages } = useMessageQueue({
    noAi: config.noAi,
    forcedMessage: config.message,
  });

  const [speedMultiplier, setSpeedMultiplier] = useState(config.speed);
  const speedRef = useRef(speedMultiplier);
  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  const [cols, setCols] = useState<ColumnState[]>(() =>
    Array.from({ length: columns }, () =>
      makeColumn(
        rows,
        Math.floor(Math.random() * columns),
        config.speed,
        config.density
      )
    )
  );

  useEffect(() => {
    setCols(
      Array.from({ length: columns }, () =>
        makeColumn(
          rows,
          Math.floor(Math.random() * 20),
          speedRef.current,
          config.density
        )
      )
    );
  }, [columns, rows, config.density]);

  const adjustSpeed = useCallback((delta: number) => {
    setSpeedMultiplier((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.min(SPEED_MAX, Math.max(SPEED_MIN, next));
    });
  }, []);

  const randomize = useCallback(() => {
    setCols(
      Array.from({ length: columns }, () =>
        makeColumn(
          rows,
          Math.floor(Math.random() * 20),
          speedRef.current,
          config.density
        )
      )
    );
  }, [columns, rows, config.density]);

  const tick = useCallback(
    (prev: ColumnState[]) => {
      const activeMessages = prev.filter((c) =>
        c.streams.some((s) => s.message !== null)
      ).length;
      return prev.map((col) => {
        const primary = col.streams[0];
        const canClaim =
          hasMessages &&
          activeMessages < MAX_MESSAGE_COLS &&
          primary !== undefined &&
          primary.restartIn === 1 &&
          Math.random() < MESSAGE_PROB;
        return tickColumn(
          col,
          rows,
          speedRef.current,
          canClaim ? dequeue() : undefined
        );
      });
    },
    [rows, dequeue, hasMessages]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: frame is an intentional tick trigger
  useEffect(() => {
    setCols(tick);
  }, [frame, tick]);

  return {
    adjustSpeed,
    randomize,
    speedMultiplier,
    speedStep: SPEED_STEP,
    columns: cols.map(
      (col): MatrixColumn => ({
        cells: col.cells,
        ages: col.ages,
        flashes: col.flashes,
        tailLens: col.tailLens,
      })
    ),
    terminalRows: rows,
    terminalCols: columns,
  };
}
