// Half-width katakana: ｦ (U+FF66) – ﾝ (U+FF9D)
// The dominant character set in the film, sourced from a Japanese sushi cookbook
// by Simon Whiteley. Exactly 56 glyphs, clamped to the authentic range.
const KATAKANA = Array.from({ length: 56 }, (_, i) =>
  String.fromCharCode(0xff_66 + i)
);

// Digits as seen in the film
const DIGITS = "0123456789".split("");

// Symbols identified from frame-by-frame analysis of the film
const SYMBOLS = [
  ":",
  '"',
  "-",
  "=",
  "*",
  "+",
  "|",
  "<",
  ">",
  "@",
  "#",
  "$",
  "%",
  "&",
  "!",
  "?",
  ".",
  ",",
];

// Turned / reversed letterforms — Unicode IPA extensions and Letterlike Symbols
// that resemble corrupted Latin letters, matching the "glitched alphabet" look
const TURNED = [
  "ɐ", // turned a      U+0250
  "ɔ", // open o        U+0254
  "ɘ", // reversed e    U+0258
  "ɹ", // turned r      U+0279
  "ɥ", // turned h      U+0265
  "ʇ", // turned t      U+0287
  "ʎ", // turned y      U+028E
  "ʍ", // turned w      U+028D
  "ɯ", // turned m      U+026F
  "ʌ", // turned v      U+028C
  "Ↄ", // reversed C    U+2183
  "Ǝ", // reversed E    U+018E
];

// Box-drawing glyphs that reinforce the "live terminal" texture
const BOX = ["│", "─", "┼", "╬", "╪"];

export const CHARS = [...KATAKANA, ...DIGITS, ...SYMBOLS, ...TURNED, ...BOX];

export const randomChar = () =>
  CHARS[Math.floor(Math.random() * CHARS.length)] as string;
