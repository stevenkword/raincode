import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Config {
  color?: string;
  density: number;
  message?: string;
  noAi: boolean;
  speed: number;
  theme: string;
  timeout?: number;
}

const CONFIG_PATH = join(homedir(), ".config", "raincode", "config.json");

const DEFAULTS: Config = {
  density: 1.0,
  noAi: false,
  speed: 1.0,
  theme: "classic",
};

function readConfigFile(): Partial<Config> {
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Partial<Config>;
  } catch {
    return {};
  }
}

const HELP = `\
Usage: raincode [options]

Options:
  --speed <n>      Animation speed multiplier (default: 1.0)
  --density <n>    Column density 0.0–1.0 (default: 1.0)
  --theme <name>   Color theme: classic, blue, red, architect, amber (default: classic)
  --color <hex>    Override base color, e.g. #00ff41
  --message <text> Pin a message to cycle through columns
  --timeout <s>    Exit after this many seconds
  --no-ai          Disable AI-generated messages
  --help           Show this help text

Config file: ~/.config/raincode/config.json
`;

export function parseConfig(): Config {
  const file = readConfigFile();
  const argv = process.argv.slice(2);
  const cli: Partial<Config> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--help":
      case "-h":
        process.stdout.write(HELP);
        process.exit(0);
        break;
      case "--speed":
        cli.speed = Number.parseFloat(next ?? "1");
        i++;
        break;
      case "--density":
        cli.density = Number.parseFloat(next ?? "1");
        i++;
        break;
      case "--theme":
        cli.theme = next ?? "classic";
        i++;
        break;
      case "--color":
        cli.color = next;
        i++;
        break;
      case "--message":
        cli.message = next;
        i++;
        break;
      case "--timeout":
        cli.timeout = Number.parseInt(next ?? "0", 10);
        i++;
        break;
      case "--no-ai":
        cli.noAi = true;
        break;
      default:
        break;
    }
  }

  return { ...DEFAULTS, ...file, ...cli };
}
