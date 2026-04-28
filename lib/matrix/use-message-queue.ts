import { generateText } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

const MODEL = "anthropic/claude-haiku-4-5-20251001";
const MIN_QUEUE = 3;
const MIN_QUEUE_CLOCK = 1;

const SYSTEM =
  "You are the Matrix. Output a single cryptic uppercase phrase of 4–12 characters " +
  "(letters and spaces only, no punctuation). Output only the phrase, nothing else. " +
  "Examples: WAKE UP, FOLLOW THE WHITE RABBIT, THE MATRIX HAS YOU, THERE IS NO SPOON, " +
  "FREE YOUR MIND, THEY ARE WATCHING, DODGE THIS, KNOW THYSELF";

async function fetchPhrase(): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: MODEL,
      system: SYSTEM,
      prompt: "Generate a cryptic phrase.",
      maxOutputTokens: 20,
    });
    const phrase = text
      .trim()
      .toUpperCase()
      .replace(/[^A-Z ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12);
    return phrase.length >= 4 ? phrase : null;
  } catch {
    return null;
  }
}

function clockPhrase(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}${mm}`;
}

interface Options {
  clock?: boolean;
  forcedMessage?: string;
  noAi?: boolean;
  pipeMessages?: string[];
}

export function useMessageQueue({
  clock = false,
  noAi = false,
  forcedMessage,
  pipeMessages,
}: Options = {}) {
  const queueRef = useRef<string[]>(forcedMessage ? [forcedMessage] : []);
  const fetchingRef = useRef(false);
  const pipeIndexRef = useRef(0);
  const [size, setSize] = useState(forcedMessage ? 1 : 0);
  const minQueue = clock ? MIN_QUEUE_CLOCK : MIN_QUEUE;

  const refill = useCallback(async () => {
    if (fetchingRef.current) {
      return;
    }
    if (forcedMessage) {
      queueRef.current.push(forcedMessage);
      setSize(queueRef.current.length);
      return;
    }
    if (pipeMessages && pipeMessages.length > 0) {
      const msg = pipeMessages[
        pipeIndexRef.current % pipeMessages.length
      ] as string;
      pipeIndexRef.current++;
      queueRef.current.push(msg);
      setSize(queueRef.current.length);
      return;
    }
    if (clock) {
      queueRef.current.push(clockPhrase());
      setSize(queueRef.current.length);
      return;
    }
    if (noAi) {
      return;
    }
    fetchingRef.current = true;
    const phrase = await fetchPhrase();
    fetchingRef.current = false;
    if (phrase !== null) {
      queueRef.current.push(phrase);
      setSize(queueRef.current.length);
    }
  }, [clock, noAi, forcedMessage, pipeMessages]);

  useEffect(() => {
    if (size < minQueue) {
      refill().catch(() => undefined);
    }
  }, [size, minQueue, refill]);

  const dequeue = useCallback((): string | undefined => {
    const phrase = queueRef.current.shift();
    setSize(queueRef.current.length);
    return phrase;
  }, []);

  return { dequeue, hasMessages: size > 0 };
}
