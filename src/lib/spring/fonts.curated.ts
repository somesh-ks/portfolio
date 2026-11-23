/**
 * The hand-picked list behind the type step. Facts (weights, scripts, size,
 * tabular figures) are generated into fonts.data.ts; this file holds only
 * what a person has to judge: genre, which jobs a face can do, and how it
 * feels on four axes, each from -1 to 1:
 *   warmth    precise, cool  ↔  human, warm
 *   energy    quiet          ↔  loud
 *   era       classic        ↔  new
 *   formality casual         ↔  formal
 */
export type Genre = "sans" | "serif" | "mono" | "display";
type Job = "heading" | "body" | "mono";
export type Feel = { warmth: number; energy: number; era: number; formality: number };

export interface Curated {
  key: string;
  genre: Genre;
  jobs: readonly Job[];
  feel: Feel;
  /** One line a designer would say about it. */
  note: string;
}

const f = (warmth: number, energy: number, era: number, formality: number): Feel => ({
  warmth,
  energy,
  era,
  formality,
});

export const CURATED = {
  Inter: {
    key: "inter",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(-0.4, -0.6, 0.2, 0.4),
    note: "The neutral workhorse. Clear at any size, but it reads as the default.",
  },
  Geist: {
    key: "geist",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(-0.6, -0.4, 0.8, 0.3),
    note: "Precise and technical, drawn for developer tools.",
  },
  "Instrument Sans": {
    key: "instrumentSans",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(0.1, 0, 0.6, 0),
    note: "A friendly grotesk with a width axis; modern without being cold.",
  },
  "Hanken Grotesk": {
    key: "hankenGrotesk",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(0, -0.3, 0.2, 0.2),
    note: "Balanced and unfussy, a quieter Inter alternative.",
  },
  "Schibsted Grotesk": {
    key: "schibstedGrotesk",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(-0.1, 0.3, 0.3, 0.3),
    note: "A newspaper grotesk: confident headlines, sturdy text.",
  },
  Manrope: {
    key: "manrope",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(-0.2, -0.2, 0.6, 0),
    note: "Semi-geometric and modern; common in fintech.",
  },
  "Plus Jakarta Sans": {
    key: "plusJakartaSans",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(0.3, 0, 0.5, -0.1),
    note: "Rounded geometric, upbeat and startup-friendly.",
  },
  Figtree: {
    key: "figtree",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(0.5, -0.2, 0.4, -0.3),
    note: "Warm geometric that stays easy to read; approachable.",
  },
  "DM Sans": {
    key: "dMSans",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(0.3, -0.3, 0.3, -0.1),
    note: "Low-contrast geometric, soft and friendly at small sizes.",
  },
  "Albert Sans": {
    key: "albertSans",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(0.1, -0.1, 0.4, 0.1),
    note: "Scandinavian geometric; clean with a little character.",
  },
  Onest: {
    key: "onest",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(0, -0.3, 0.5, 0.1),
    note: "Calm and legible, with strong Cyrillic.",
  },
  "Public Sans": {
    key: "publicSans",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(-0.5, -0.7, -0.2, 0.7),
    note: "Made for US government sites: neutral, trustworthy, plain.",
  },
  "IBM Plex Sans": {
    key: "iBMPlexSans",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(-0.4, -0.2, 0, 0.6),
    note: "Engineered and corporate, with a human edge in the curves.",
  },
  "Work Sans": {
    key: "workSans",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(0.2, 0, 0, -0.1),
    note: "Slightly grotesque and open; good for screens.",
  },
  Sora: {
    key: "sora",
    genre: "sans",
    jobs: ["heading", "body"],
    feel: f(-0.2, 0.2, 0.8, 0),
    note: "Wide and futuristic; reads as web3 and tech.",
  },
  Outfit: {
    key: "outfit",
    genre: "display",
    jobs: ["heading"],
    feel: f(0.3, 0.3, 0.6, -0.4),
    note: "Pure geometric headlines; playful and round.",
  },
  "Space Grotesk": {
    key: "spaceGrotesk",
    genre: "display",
    jobs: ["heading"],
    feel: f(-0.3, 0.5, 0.7, -0.2),
    note: "Quirky tech grotesk with odd details; nerdy and fun.",
  },
  "Bricolage Grotesque": {
    key: "bricolageGrotesque",
    genre: "display",
    jobs: ["heading"],
    feel: f(0.6, 0.8, 0.6, -0.6),
    note: "Expressive and inky at large sizes; editorial with attitude.",
  },
  "Familjen Grotesk": {
    key: "familjenGrotesk",
    genre: "display",
    jobs: ["heading"],
    feel: f(0.3, 0.4, 0.3, -0.2),
    note: "Chunky Swedish grotesk; warm and a bit cheeky.",
  },
  Syne: {
    key: "syne",
    genre: "display",
    jobs: ["heading"],
    feel: f(0, 0.9, 0.9, -0.3),
    note: "Art-gallery loud; stretches wide at heavy weights.",
  },
  Unbounded: {
    key: "unbounded",
    genre: "display",
    jobs: ["heading"],
    feel: f(0.2, 0.9, 0.9, -0.5),
    note: "Wide, round and playful; big personality, use short words.",
  },
  "Source Serif 4": {
    key: "sourceSerif4",
    genre: "serif",
    jobs: ["heading", "body"],
    feel: f(-0.1, -0.5, -0.4, 0.7),
    note: "A readable editorial serif with optical sizes.",
  },
  Newsreader: {
    key: "newsreader",
    genre: "serif",
    jobs: ["heading", "body"],
    feel: f(0.2, -0.4, -0.5, 0.6),
    note: "Made for news and long reads; calm authority.",
  },
  Literata: {
    key: "literata",
    genre: "serif",
    jobs: ["heading", "body"],
    feel: f(0.3, -0.5, -0.3, 0.4),
    note: "Designed for e-books; warm and very readable.",
  },
  Lora: {
    key: "lora",
    genre: "serif",
    jobs: ["heading", "body"],
    feel: f(0.6, -0.3, -0.4, 0.2),
    note: "Calligraphic and warm; gentle storytelling.",
  },
  "EB Garamond": {
    key: "eBGaramond",
    genre: "serif",
    jobs: ["heading", "body"],
    feel: f(0.3, -0.4, -1, 0.8),
    note: "Classical and literary; best large and in print-like layouts.",
  },
  Fraunces: {
    key: "fraunces",
    genre: "serif",
    jobs: ["heading"],
    feel: f(0.8, 0.5, -0.2, -0.2),
    note: "Soft, wonky old-style; warm and handmade.",
  },
  "Young Serif": {
    key: "youngSerif",
    genre: "serif",
    jobs: ["heading"],
    feel: f(0.7, 0.4, -0.3, -0.3),
    note: "Chunky and friendly; a cookbook on a sunny day.",
  },
  "Instrument Serif": {
    key: "instrumentSerif",
    genre: "serif",
    jobs: ["heading"],
    feel: f(0.3, 0.4, 0.3, 0.3),
    note: "Condensed display serif; fashion-editorial, one weight.",
  },
  "DM Serif Display": {
    key: "dMSerifDisplay",
    genre: "serif",
    jobs: ["heading"],
    feel: f(0.2, 0.6, -0.6, 0.5),
    note: "High-contrast headlines; premium and dramatic.",
  },
  Gloock: {
    key: "gloock",
    genre: "serif",
    jobs: ["heading"],
    feel: f(0.4, 0.7, -0.2, 0.2),
    note: "Bold, sharp serif headlines with a sculpted feel.",
  },
  "Geist Mono": {
    key: "geistMono",
    genre: "mono",
    jobs: ["mono"],
    feel: f(-0.6, -0.3, 0.8, 0.2),
    note: "Clean and technical; pairs with Geist.",
  },
  "JetBrains Mono": {
    key: "jetBrainsMono",
    genre: "mono",
    jobs: ["mono"],
    feel: f(-0.4, -0.2, 0.5, 0.1),
    note: "Tall x-height, made for reading code all day.",
  },
  "IBM Plex Mono": {
    key: "iBMPlexMono",
    genre: "mono",
    jobs: ["mono"],
    feel: f(-0.3, -0.2, 0, 0.4),
    note: "Engineered with warm italics; pairs with Plex Sans.",
  },
  "DM Mono": {
    key: "dMMono",
    genre: "mono",
    jobs: ["mono"],
    feel: f(0.2, -0.3, 0.3, 0),
    note: "Soft and friendly, for numbers and labels more than code.",
  },
  "Space Mono": {
    key: "spaceMono",
    genre: "mono",
    jobs: ["mono"],
    feel: f(0, 0.5, 0.4, -0.3),
    note: "Retro, characterful mono; great for labels, tiring for code.",
  },
} as const satisfies Record<string, Curated>;
