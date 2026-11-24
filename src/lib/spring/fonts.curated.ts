/**
 * The hand-picked list behind the type step. Facts (weights, scripts, size,
 * tabular figures) are generated into fonts.data.ts; this file holds only
 * what a person has to judge: genre and a one-line note.
 */
type Genre = "sans" | "serif" | "mono" | "display";

export interface Curated {
  key: string;
  genre: Genre;
  /** One line a designer would say about it. */
  note: string;
}

export const CURATED = {
  Inter: {
    key: "inter",
    genre: "sans",
    note: "The neutral workhorse. Clear at any size, but it reads as the default.",
  },
  Geist: {
    key: "geist",
    genre: "sans",
    note: "Precise and technical, drawn for developer tools.",
  },
  "Instrument Sans": {
    key: "instrumentSans",
    genre: "sans",
    note: "A friendly grotesk with a width axis; modern without being cold.",
  },
  "Hanken Grotesk": {
    key: "hankenGrotesk",
    genre: "sans",
    note: "Balanced and unfussy, a quieter Inter alternative.",
  },
  "Schibsted Grotesk": {
    key: "schibstedGrotesk",
    genre: "sans",
    note: "A newspaper grotesk: confident headlines, sturdy text.",
  },
  Manrope: {
    key: "manrope",
    genre: "sans",
    note: "Semi-geometric and modern; common in fintech.",
  },
  "Plus Jakarta Sans": {
    key: "plusJakartaSans",
    genre: "sans",
    note: "Rounded geometric, upbeat and startup-friendly.",
  },
  Figtree: {
    key: "figtree",
    genre: "sans",
    note: "Warm geometric that stays easy to read; approachable.",
  },
  "DM Sans": {
    key: "dMSans",
    genre: "sans",
    note: "Low-contrast geometric, soft and friendly at small sizes.",
  },
  "Albert Sans": {
    key: "albertSans",
    genre: "sans",
    note: "Scandinavian geometric; clean with a little character.",
  },
  Onest: {
    key: "onest",
    genre: "sans",
    note: "Calm and legible, with strong Cyrillic.",
  },
  "Public Sans": {
    key: "publicSans",
    genre: "sans",
    note: "Made for US government sites: neutral, trustworthy, plain.",
  },
  "IBM Plex Sans": {
    key: "iBMPlexSans",
    genre: "sans",
    note: "Engineered and corporate, with a human edge in the curves.",
  },
  "Work Sans": {
    key: "workSans",
    genre: "sans",
    note: "Slightly grotesque and open; good for screens.",
  },
  Sora: {
    key: "sora",
    genre: "sans",
    note: "Wide and futuristic; reads as web3 and tech.",
  },
  Outfit: {
    key: "outfit",
    genre: "display",
    note: "Pure geometric headlines; playful and round.",
  },
  "Space Grotesk": {
    key: "spaceGrotesk",
    genre: "display",
    note: "Quirky tech grotesk with odd details; nerdy and fun.",
  },
  "Bricolage Grotesque": {
    key: "bricolageGrotesque",
    genre: "display",
    note: "Expressive and inky at large sizes; editorial with attitude.",
  },
  "Familjen Grotesk": {
    key: "familjenGrotesk",
    genre: "display",
    note: "Chunky Swedish grotesk; warm and a bit cheeky.",
  },
  Syne: {
    key: "syne",
    genre: "display",
    note: "Art-gallery loud; stretches wide at heavy weights.",
  },
  Unbounded: {
    key: "unbounded",
    genre: "display",
    note: "Wide, round and playful; big personality, use short words.",
  },
  "Source Serif 4": {
    key: "sourceSerif4",
    genre: "serif",
    note: "A readable editorial serif with optical sizes.",
  },
  Newsreader: {
    key: "newsreader",
    genre: "serif",
    note: "Made for news and long reads; calm authority.",
  },
  Literata: {
    key: "literata",
    genre: "serif",
    note: "Designed for e-books; warm and very readable.",
  },
  Lora: {
    key: "lora",
    genre: "serif",
    note: "Calligraphic and warm; gentle storytelling.",
  },
  "EB Garamond": {
    key: "eBGaramond",
    genre: "serif",
    note: "Classical and literary; best large and in print-like layouts.",
  },
  Fraunces: {
    key: "fraunces",
    genre: "serif",
    note: "Soft, wonky old-style; warm and handmade.",
  },
  "Young Serif": {
    key: "youngSerif",
    genre: "serif",
    note: "Chunky and friendly; a cookbook on a sunny day.",
  },
  "Instrument Serif": {
    key: "instrumentSerif",
    genre: "serif",
    note: "Condensed display serif; fashion-editorial, one weight.",
  },
  "DM Serif Display": {
    key: "dMSerifDisplay",
    genre: "serif",
    note: "High-contrast headlines; premium and dramatic.",
  },
  Gloock: {
    key: "gloock",
    genre: "serif",
    note: "Bold, sharp serif headlines with a sculpted feel.",
  },
  "Geist Mono": {
    key: "geistMono",
    genre: "mono",
    note: "Clean and technical; pairs with Geist.",
  },
  "JetBrains Mono": {
    key: "jetBrainsMono",
    genre: "mono",
    note: "Tall x-height, made for reading code all day.",
  },
  "IBM Plex Mono": {
    key: "iBMPlexMono",
    genre: "mono",
    note: "Engineered with warm italics; pairs with Plex Sans.",
  },
  "DM Mono": {
    key: "dMMono",
    genre: "mono",
    note: "Soft and friendly, for numbers and labels more than code.",
  },
  "Space Mono": {
    key: "spaceMono",
    genre: "mono",
    note: "Retro, characterful mono; great for labels, tiring for code.",
  },
} as const satisfies Record<string, Curated>;
