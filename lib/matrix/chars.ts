const KATAKANA = Array.from({ length: 96 }, (_, i) =>
  String.fromCharCode(0xff_66 + i)
);
const DIGITS = "0123456789".split("");
const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");

export const CHARS = [...KATAKANA, ...DIGITS, ...LATIN];

export const randomChar = () =>
  CHARS[Math.floor(Math.random() * CHARS.length)] as string;
