import { useWindowSize } from "ink";
import { useCallback, useEffect, useReducer, useRef } from "react";
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
const TICK_MS = 50;
const CYCLE_DELTA = 0.5; // degrees per tick (~10°/s at 20fps)

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

export interface MatrixColumn {
  ages: Int16Array;
  cells: (string | null)[];
  flashes: Uint8Array;
  tailLens: Uint8Array;
}

interface ColumnState extends MatrixColumn {
  dissolves: Uint8Array;
  streams: StreamState[];
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
    ages: new Int16Array(rows).fill(-1),
    cells: new Array<string | null>(rows).fill(null),
    dissolves: new Uint8Array(rows),
    flashes: new Uint8Array(rows),
    tailLens: new Uint8Array(rows).fill(12),
    streams: [makeStream(dormant ? 99_999 : initialDelay, speedMultiplier)],
  };
}

// One pass: decrement flashes, age cells, expire aged-out cells, mutate tail
function tickCellsInPlace(col: ColumnState, rows: number): void {
  const { ages, cells, flashes, dissolves, tailLens } = col;
  for (let r = 0; r < rows; r++) {
    if (flashes[r] > 0) {
      flashes[r]--;
    }

    const age = ages[r];
    if (age < 0) {
      continue;
    }

    const newAge = age + 1;
    if (newAge > tailLens[r] && dissolves[r] === 0) {
      ages[r] = -1;
      cells[r] = null;
      flashes[r] = 0;
      continue;
    }
    ages[r] = newAge;

    if (dissolves[r] > 0) {
      cells[r] = randomChar();
      dissolves[r]--;
    } else if (newAge > 0 && Math.random() < MUTATION_RATE) {
      cells[r] = randomChar();
    }
  }
}

// Reservoir sampling: pick a uniform random live cell without allocating an array
function maybeFlashBurst(
  ages: Int16Array,
  flashes: Uint8Array,
  rows: number
): void {
  if (Math.random() >= FLASH_PROB) {
    return;
  }
  let count = 0;
  let target = -1;
  for (let r = 0; r < rows; r++) {
    if (ages[r] > 0) {
      count++;
      if (Math.floor(Math.random() * count) === 0) {
        target = r;
      }
    }
  }
  if (target >= 0) {
    flashes[target] = 2;
  }
}

interface HeadAdvanceResult {
  head: number;
  headAcc: number;
  justExhaustedMessage: boolean;
  message: MessageState | null;
}

function advanceStreamHead(
  stream: StreamState,
  col: ColumnState,
  rows: number
): HeadAdvanceResult {
  const { ages, cells, flashes, tailLens, dissolves } = col;
  let { head, headAcc, message } = stream;
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

function applyMessageDissolve(col: ColumnState, rows: number): void {
  const { ages, cells, dissolves } = col;
  for (let r = 0; r < rows; r++) {
    if (ages[r] >= 0 && cells[r] !== null && dissolves[r] === 0) {
      dissolves[r] = 3 + Math.floor(Math.random() * 3);
    }
  }
}

function tickStream(
  stream: StreamState,
  col: ColumnState,
  rows: number,
  isPrimary: boolean,
  nextMessage?: string
): StreamState | null {
  if (stream.restartIn > 0) {
    const newRestartIn = stream.restartIn - 1;
    if (newRestartIn === 0 && isPrimary && nextMessage !== undefined) {
      return {
        ...stream,
        restartIn: 0,
        message: { chars: [...nextMessage], pos: 0 },
      };
    }
    return { ...stream, restartIn: newRestartIn };
  }

  const { head, headAcc, message, justExhaustedMessage } = advanceStreamHead(
    stream,
    col,
    rows
  );

  if (justExhaustedMessage) {
    applyMessageDissolve(col, rows);
  }

  if (head >= rows + stream.tailLen) {
    if (!isPrimary) {
      return null; // secondary stream done — drop it
    }
    return {
      ...stream,
      head: -1,
      headAcc: 0,
      message: null,
      restartIn: Math.floor(Math.random() * 20) + 3,
      tailLen: 8 + Math.floor(Math.random() * 12),
    };
  }

  return { ...stream, head, headAcc, message };
}

function tickColumnInPlace(
  col: ColumnState,
  rows: number,
  speedMultiplier: number,
  nextMessage?: string
): void {
  tickCellsInPlace(col, rows);
  maybeFlashBurst(col.ages, col.flashes, rows);

  const newStreams: StreamState[] = [];
  for (let si = 0; si < col.streams.length; si++) {
    const updated = tickStream(
      col.streams[si] as StreamState,
      col,
      rows,
      si === 0,
      si === 0 ? nextMessage : undefined
    );
    if (updated !== null) {
      newStreams.push(updated);
    }
  }

  const primary = newStreams[0];
  if (
    newStreams.length < MAX_STREAMS &&
    primary !== undefined &&
    primary.restartIn === 0 &&
    primary.head >= Math.floor(rows * SECOND_STREAM_THRESHOLD) &&
    primary.head < rows &&
    Math.random() < SECOND_STREAM_PROB
  ) {
    newStreams.push(makeStream(0, speedMultiplier));
  }

  col.streams = newStreams;
}

function processTick(
  cols: ColumnState[],
  rows: number,
  speed: number,
  hasMessages: boolean,
  dequeue: () => string | undefined
): void {
  let activeMessages = 0;
  for (const col of cols) {
    if (col.streams.some((s) => s.message !== null)) {
      activeMessages++;
    }
  }

  for (const col of cols) {
    // 16c: dormant columns only need restartIn decremented — skip cell work
    if (col.streams.every((s) => s.restartIn > 1)) {
      for (const s of col.streams) {
        s.restartIn--;
      }
      continue;
    }

    const primary = col.streams[0];
    const canClaim =
      hasMessages &&
      activeMessages < MAX_MESSAGE_COLS &&
      primary !== undefined &&
      primary.restartIn === 1 &&
      Math.random() < MESSAGE_PROB;

    tickColumnInPlace(col, rows, speed, canClaim ? dequeue() : undefined);
  }
}

export function useMatrixState(config: Config) {
  const { columns: termCols, rows: termRows } = useWindowSize();
  const { dequeue, hasMessages } = useMessageQueue({
    noAi: config.noAi,
    forcedMessage: config.message,
  });

  const speedRef = useRef(config.speed);
  const colsRef = useRef<ColumnState[]>([]);
  const termRowsRef = useRef(termRows);
  const hasMessagesRef = useRef(hasMessages);
  const dequeueRef = useRef(dequeue);
  const pausedRef = useRef(false);
  const cyclingRef = useRef(config.cycle);
  const hueOffsetRef = useRef(0);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  // Keep refs current each render so the tick closure always sees fresh values
  hasMessagesRef.current = hasMessages;
  dequeueRef.current = dequeue;
  termRowsRef.current = termRows;

  // Init or resize the column buffer when terminal dimensions change
  useEffect(() => {
    colsRef.current = Array.from({ length: termCols }, (_, i) => {
      const existing = colsRef.current[i];
      if (existing && existing.ages.length === termRows) {
        return existing;
      }
      return makeColumn(
        termRows,
        Math.floor(Math.random() * Math.max(termCols, 1)),
        speedRef.current,
        config.density
      );
    });
  }, [termCols, termRows, config.density]);

  // Stable tick loop — reads all mutable state through refs
  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      if (!pausedRef.current) {
        processTick(
          colsRef.current,
          termRowsRef.current,
          speedRef.current,
          hasMessagesRef.current,
          dequeueRef.current
        );
        if (cyclingRef.current) {
          hueOffsetRef.current = (hueOffsetRef.current + CYCLE_DELTA) % 360;
        }
      }
      // Physics at 20 fps, React renders at 10 fps
      if (tick % 2 === 0) {
        forceRender();
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    forceRender();
  }, []);

  const toggleCycle = useCallback(() => {
    cyclingRef.current = !cyclingRef.current;
    forceRender();
  }, []);

  const adjustSpeed = useCallback((delta: number) => {
    const next = Math.round((speedRef.current + delta) * 100) / 100;
    speedRef.current = Math.min(SPEED_MAX, Math.max(SPEED_MIN, next));
    forceRender();
  }, []);

  const randomize = useCallback(() => {
    for (const col of colsRef.current) {
      col.ages.fill(-1);
      col.cells.fill(null);
      col.flashes.fill(0);
      col.dissolves.fill(0);
      col.tailLens.fill(12);
      col.streams = [
        makeStream(Math.floor(Math.random() * 20), speedRef.current),
      ];
    }
    forceRender();
  }, []);

  return {
    adjustSpeed,
    cycling: cyclingRef.current,
    hueOffset: hueOffsetRef.current,
    paused: pausedRef.current,
    randomize,
    speedMultiplier: speedRef.current,
    speedStep: SPEED_STEP,
    toggleCycle,
    togglePause,
    columns: colsRef.current as MatrixColumn[],
    terminalRows: termRows,
    terminalCols: termCols,
  };
}
