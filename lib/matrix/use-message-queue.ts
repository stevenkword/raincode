import { generateText } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

const MODEL = "anthropic/claude-haiku-4-5-20251001";
const MIN_QUEUE = 3;

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

export function useMessageQueue() {
  const queueRef = useRef<string[]>([]);
  const fetchingRef = useRef(false);
  const [size, setSize] = useState(0);

  const refill = useCallback(async () => {
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;
    const phrase = await fetchPhrase();
    fetchingRef.current = false;
    if (phrase !== null) {
      queueRef.current.push(phrase);
      setSize(queueRef.current.length);
    }
  }, []);

  // Keep the queue topped up
  useEffect(() => {
    if (size < MIN_QUEUE) {
      refill().catch(() => undefined);
    }
  }, [size, refill]);

  const dequeue = useCallback((): string | undefined => {
    const phrase = queueRef.current.shift();
    setSize(queueRef.current.length);
    return phrase;
  }, []);

  return { dequeue, hasMessages: size > 0 };
}
