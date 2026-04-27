# zmatrix

A modern terminal clone of the classic `cmatrix` screensaver, built with React Ink and brought up to 2026 with true-color rendering, AI-generated messages, and full screensaver polish.

---

## Inspiration

`cmatrix` was written by Chris Allegretta in 1999, inspired by the opening title sequence of *The Matrix*. The film's digital rain was designed by production designer Simon Whiteley, who fed pages from his wife's Japanese sushi cookbook through a scanner and composited the characters into the cascading green columns that became one of cinema's most iconic visual motifs.

`zmatrix` reimplements that effect from scratch in TypeScript, faithful to the source material but taking full advantage of what modern terminals and AI APIs make possible in 2026:

- **24-bit true-color** phosphor gradients rather than 8-color approximations
- **Film-accurate character set** — the actual half-width katakana block (`ｦ`–`ﾝ`) used by Whiteley, paired with the symbols and digits from the rain
- **Character mutation** — tail cells randomly re-roll their glyph each tick, matching the shimmering look of the film
- **Flash bursts** — random cells briefly flare to near-head brightness
- **AI-generated messages** — Claude (claude-haiku-4-5) streams short Matrix-themed phrases that surface letter by letter in the rain, just like the hidden text easter eggs in the original film
- **Full screensaver behavior** — alternate screen buffer, cursor hide/restore, macOS `caffeinate` integration

---

## Installation

**Prerequisites:** [Bun](https://bun.sh) 1.x

```bash
git clone <repo>
cd zmatrix
bun install
```

Run directly:

```bash
bun run matrix
```

Or link as a global command:

```bash
bun link
zmatrix
```

**AI messages** require an Anthropic API key (or any AI SDK-compatible gateway) in your environment. Without one, pass `--no-ai` to skip AI generation.

---

## Usage

```
zmatrix [options]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--speed <n>` | `1.0` | Animation speed multiplier |
| `--density <n>` | `1.0` | Fraction of columns actively raining (0.0–1.0) |
| `--theme <name>` | `classic` | Named color theme (see below) |
| `--color <hex>` | — | Override the base rain color, e.g. `#00ff41` |
| `--message <text>` | — | Pin a message to cycle through the rain |
| `--timeout <s>` | — | Exit automatically after N seconds; shows a countdown |
| `--no-ai` | `false` | Disable AI-generated messages |
| `--help` | — | Print this usage text |

Press `q` or `Ctrl-C` to exit at any time.

### Themes

| Name | Description |
|------|-------------|
| `classic` | Film-accurate matrix green |
| `blue` | Zion operator console |
| `red` | Red pill / danger |
| `architect` | The Architect's white room |
| `amber` | Old-school phosphor amber |

### Examples

```bash
# Slower, sparser rain
zmatrix --speed 0.5 --density 0.6

# Red theme, faster
zmatrix --theme red --speed 1.8

# Custom color
zmatrix --color "#00ccff"

# Force a message into the rain
zmatrix --message "THERE IS NO SPOON"

# Run as a screensaver for 5 minutes
zmatrix --timeout 300

# No AI, classic look
zmatrix --no-ai
```

### Config file

Persistent defaults can be stored at `~/.config/zmatrix/config.json`. CLI flags override file values.

```json
{
  "theme": "classic",
  "speed": 1.0,
  "density": 1.0,
  "noAi": false
}
```
