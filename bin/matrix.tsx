#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { render } from "ink";
import App from "../lib/matrix/app.js";
import { parseConfig } from "../lib/matrix/config.js";

const ENTER_ALT = "\x1b[?1049h\x1b[?25l";
const EXIT_ALT = "\x1b[?1049l\x1b[?25h";

function restoreTerminal() {
  process.stdout.write(EXIT_ALT);
}

process.stdout.write(ENTER_ALT);
process.on("exit", restoreTerminal);
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

if (process.platform === "darwin") {
  spawn("caffeinate", ["-w", String(process.pid)], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

const config = parseConfig();
const { waitUntilExit } = render(<App config={config} />);
await waitUntilExit();
