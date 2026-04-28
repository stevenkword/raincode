#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { render } from "ink";
import App from "../lib/matrix/app.js";
import { parseConfig } from "../lib/matrix/config.js";

const ENTER_ALT = "\x1b[?1049h\x1b[?25l";
const EXIT_ALT = "\x1b[?1049l\x1b[?25h";

// Parse config first so --help can print to the main screen and exit cleanly
const config = parseConfig();

// Read piped stdin before entering the alt screen
if (!process.stdin.isTTY) {
  const lines = await new Promise<string[]>((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      crlfDelay: Number.POSITIVE_INFINITY,
    });
    const acc: string[] = [];
    rl.on("line", (line: string) => {
      const cleaned = line
        .trim()
        .toUpperCase()
        .replace(/[^A-Z ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length >= 2) {
        acc.push(cleaned);
      }
    });
    rl.on("close", () => resolve(acc));
  });
  if (lines.length > 0) {
    config.pipeMessages = lines;
  }
}

process.stdout.write(ENTER_ALT);
process.on("exit", () => process.stdout.write(EXIT_ALT));
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

if (process.platform === "darwin") {
  spawn("caffeinate", ["-w", String(process.pid)], {
    detached: true,
    stdio: "ignore",
  }).unref();
}
const { waitUntilExit } = render(<App config={config} />);
await waitUntilExit();
