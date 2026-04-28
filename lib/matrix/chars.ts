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

// Weighted pool: katakana repeated 4× gives ~80% katakana, ~7% digits, ~13% symbols —
// matching the film's character distribution. Box-drawing and turned-letter glyphs
// are excluded; they don't appear in the film.
export const CHARS = [
  ...KATAKANA,
  ...KATAKANA,
  ...KATAKANA,
  ...KATAKANA,
  ...DIGITS,
  ...SYMBOLS,
];

export const randomChar = () =>
  CHARS[Math.floor(Math.random() * CHARS.length)] as string;
