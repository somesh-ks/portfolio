/**
 * Curated pages for the comic shelf reader, exported from the ENFW14 course folder
 * by `bun run comics:pages`. Each book keeps 12 pages: cover, cast, act openers and key scenes.
 */

/** "spread": each image is a two-page 16:9 spread. "page": each image is one portrait page. */
type ComicFormat = "spread" | "page";

interface ComicPick {
  file: string;
  label: string;
}

export interface ComicBookPages {
  id: string;
  /** Folder under the source root that holds the rendered pages. */
  dir: string;
  format: ComicFormat;
  width: number;
  height: number;
  picks: readonly ComicPick[];
}

const COMIC_PAGES_BASE = "/case-studies/graphic-comic-making-from-novels/books";

export const COMIC_BOOK_PAGES: readonly [ComicBookPages, ...ComicBookPages[]] = [
  {
    id: "frankenstein",
    dir: "2. Journals/Journal 2 (Due 15 Sep)/Frankenstein/assets/images/pages",
    format: "spread",
    width: 1600,
    height: 900,
    picks: [
      { file: "p001.png", label: "cover, Victor below alpine ice" },
      { file: "p002.png", label: "cast: the seekers and the progeny" },
      { file: "p004.png", label: "chronological roadmap" },
      { file: "p005.png", label: "Volume I opener: the northern horizon" },
      { file: "p014.png", label: "Volume I, part 2: the spark of being" },
      { file: "p018.png", label: "Victor leaning over the Creature with a galvanic probe" },
      { file: "p019.png", label: "the Creature's eye opens and Victor flees" },
      { file: "p024.png", label: "Volume II opener: the voice of the shadow" },
      { file: "p029.png", label: "the Creature crossing the glacier" },
      { file: "p034.png", label: "Volume II, part 2: the cottage and the fall" },
      { file: "p041.png", label: "the cottage in flames" },
      { file: "p052.png", label: "Volume III opener: the wedding night and arctic pyre" },
    ],
  },
  {
    id: "paradise-lost",
    dir: "2. Journals/Journal 2 (Due 15 Sep)/Paradise Lost Book/graphic_novel/pages",
    format: "page",
    width: 864,
    height: 1152,
    picks: [
      { file: "p001.png", label: "engraved cover of Satan" },
      { file: "p002.png", label: "storyline roadmap" },
      { file: "p003.png", label: "cast: the sovereigns of Hell" },
      { file: "p005.png", label: "Act I: from Heaven's height to Hell's abyss" },
      { file: "p009.png", label: "Satan rises from the burning lake" },
      { file: "p013.png", label: "Act II: the shore of sulfur and the call to arms" },
      { file: "p017.png", label: "the fallen legions answer" },
      { file: "p021.png", label: "Act III: the mask of idols" },
      { file: "p029.png", label: "Act IV: the high capital of Hell" },
      { file: "p031.png", label: "Mammon's crews mine gold" },
      { file: "p033.png", label: "Pandemonium's hall of lamps" },
      { file: "p035.png", label: "the infernal council" },
    ],
  },
  {
    id: "jane-eyre",
    dir: "2. Journals/Journal 3 (Due 29 Sep)/Jane Eyre/assets/images/pages",
    format: "spread",
    width: 1600,
    height: 900,
    picks: [
      { file: "p001.png", label: "cover, Jane on the heath" },
      { file: "p002.png", label: "cast: principal figures" },
      { file: "p015.png", label: "Act II opener: Lowood Institution" },
      { file: "p026.png", label: "Helen Burns and the Resurgam stone" },
      { file: "p028.png", label: "Act III opener: Thornfield Hall" },
      { file: "p036.png", label: "fire in Rochester's bedchamber" },
      { file: "p050.png", label: "the proposal under the chestnut, split by lightning" },
      { file: "p054.png", label: "Act IV opener: Moor House and Morton" },
      { file: "p055.png", label: "the interrupted wedding" },
      { file: "p069.png", label: "Act V opener: Ferndean and reunion" },
      { file: "p071.png", label: "Thornfield burns" },
      { file: "p079.png", label: "reunion at Ferndean" },
    ],
  },
  {
    id: "mrs-dalloway",
    dir: "2. Journals/Journal 4 (Due 13 Oct)/Mrs Dalloway/assets/images/pages",
    format: "spread",
    width: 1600,
    height: 900,
    picks: [
      { file: "p001.png", label: "cover, Clarissa below Big Ben" },
      { file: "p003.png", label: "cast: veterans, doctors and youth" },
      { file: "p004.png", label: "chronology of a single day" },
      { file: "p005.png", label: "Westminster on a June morning" },
      { file: "p012.png", label: "the skywriting aeroplane over the park" },
      { file: "p019.png", label: "mending the green dress" },
      { file: "p029.png", label: "Chapter III: Harley Street and the powers of the world" },
      { file: "p041.png", label: "Chapter IV: the falling shadows" },
      { file: "p044.png", label: "Septimus at the window" },
      { file: "p050.png", label: "Clarissa's party and the striking hour" },
      { file: "p052.png", label: "guests arrive at the party" },
      { file: "p060.png", label: "epilogue study guide" },
    ],
  },
  {
    id: "heart-of-darkness",
    dir: "3. Oral Presentations/Seminar 4/Heart of Darkness/Novel/assets/images/pages",
    format: "page",
    width: 900,
    height: 1350,
    picks: [
      { file: "p001.png", label: "cover, Marlow on the river" },
      { file: "p002.png", label: "cast: principal figures" },
      { file: "p004.png", label: "storyline roadmap" },
      { file: "p005.png", label: "the Thames at dusk" },
      { file: "p009.png", label: "the steamer along the coast" },
      { file: "p019.png", label: "Act II: into the heart of the wilderness" },
      { file: "p026.png", label: "fog on the river" },
      { file: "p039.png", label: "Act III: the inner station and the abyss" },
      { file: "p048.png", label: "Kurtz's report" },
      { file: "p050.png", label: "Kurtz's last words" },
      { file: "p055.png", label: "Marlow visits the Intended" },
      { file: "p059.png", label: "critical companion" },
    ],
  },
  {
    id: "ozymandias",
    dir: "3. Oral Presentations/Seminar 6/2. Books/Ozymandias/assets/images/conceptual_plates",
    format: "spread",
    width: 1280,
    height: 720,
    picks: [
      { file: "plate_01_anatomy_of_ruin.png", label: "plate 1: the anatomy of ruin" },
      {
        file: "plate_02_nested_narrative_architecture.png",
        label: "plate 2: four degrees of separation",
      },
      { file: "plate_03_physiognomy_of_power.png", label: "plate 3: the physiognomy of tyranny" },
      { file: "plate_04_sculptor_silent_revenge.png", label: "plate 4: the hand that mocked them" },
      { file: "plate_05_pedestal_paradox_irony.png", label: "plate 5: the pedestal paradox" },
      { file: "plate_06_protagonist_of_emptiness.png", label: "plate 6: the poetics of emptiness" },
      {
        file: "plate_07_political_subtext_waterloo.png",
        label: "plate 7: Shelley's radical critique",
      },
      { file: "plate_08_imperial_extraction_belzoni.png", label: "plate 8: the young Memnon" },
      {
        file: "plate_09_rivalry_ruin_of_london.png",
        label: "plate 9: Shelley versus Horace Smith",
      },
      {
        file: "plate_10_anatomy_of_broken_sonnet.png",
        label: "plate 10: anatomy of a broken sonnet",
      },
      { file: "plate_12_nothing_ever_ends_verdict.png", label: "plate 12: the verdict of time" },
      { file: "plate_13_postmodernism_simulacrum.png", label: "plate 13: postmodern Ozymandias" },
    ],
  },
];

export const comicPageSrc = (id: string, index: number) =>
  `${COMIC_PAGES_BASE}/${id}/${String(index + 1).padStart(2, "0")}.webp`;
