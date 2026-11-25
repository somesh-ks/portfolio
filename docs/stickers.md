# Sticker studio: adding art

`/stickers` composes an **action** (body motion), up to one **item** per slot and an outline width.
Everything is data: no model call, no database. A PR is the review step.

- Engine: `src/lib/stickers/` (public API listed at the top of `index.ts`).
- Actions: `actions.ts`. Items: `items/{head,face,hand,effect,ride}.ts`.
- Any action works with any item. Nothing is ever disabled; the rig adapts (see claims below).

## Add an item

Add one entry to the slot's registry file. Id, label, tile, thumbnail, URL (`p=`), file name and
tests all come from the entry. The format is documented at the top of `items/hand.ts`.

```ts
{
  id: "scarf",            // unique across every slot; goes in the URL and file names
  name: "Scarf",          // label and tooltip
  slot: "head",           // head | face | hand | effect | ride
  anchor: "head",         // what the art follows, table below
  at: [4, -2],            // top-left cell of rows, in mascot cells
  palette: { R: K.red },  // char -> hex, K = COLORS from ../palette
  rows: ["RRRR", "R..R"], // '.' is empty
}
```

The mascot is 24 x 16 cells: head x 4..19, rows 0..11; arms x 0..3 and 20..23 on rows 4..7; legs
below. Negative coordinates are fine. Somesh's `claude-pixel-stickers` skill can draft the ASCII.

| anchor   | follows                                    | examples                     |
| -------- | ------------------------------------------ | ---------------------------- |
| `head`   | the body                                   | hats                         |
| `face`   | the body, eyes stop glancing (`eyeTint`)   | shades, glasses              |
| `handL`  | the left arm; draw the grip, then the fist | mug, flag, balloon           |
| `front`  | the body, held with both arms              | laptop, book, console, plate |
| `ground` | the ground line, no bob                    | signs, ships                 |
| `lane`   | fixed lane at the upper right of the head  | every effect                 |
| `ride`   | the body, never below the ground           | skate, scooter, bike, Dala   |

`claims` says which limbs an item takes over:

- `claims: "arms"` (front items): both arms ignore the action and use `hold(f)`, an offset per arm
  relative to the body. Each hand must touch the item (a test checks it).
- `claims: "legs"` (rides): the legs ignore the action. `seat: "stand"` keeps them visible on the
  ride, `"hide"` tucks them behind its front layer. `ground` is the ground line for the shadow.
  Give rides `parts` with `z: "back"` and `"front"`; wheel states switch by frame with `at`.
- Effects (`lane`) live at x 21..30, y -16..-1, never above the head, and loop over the action's
  frame count: give each particle `at(f, n)` returning `[dx, dy]` or `null` to hide it.

Optional per entry: `layers` (hand-built rects, for alpha), `parts` (several pieces), `pose(f, n)`,
`eyeTint`, `z`. Keep an item under about 60 rects.

Then:

1. `bun test tests/unit/stickers.test.ts`. It runs every action alone with the item and in
   colliding pairs, outline off and thin: the body stays one piece, limbs overlap the torso, held
   items touch the hands, nothing but a face item covers the eyes, bounds stay within 48 x 48 cells.
2. `bun scripts/sticker-sheet.ts` writes `engine-sheet.png` (and a dark one) to
   `/mnt/project-files/sticker-studio/v3/`. Look at it: hats sit on the head, held things sit in
   the hand, rides sit under the body.

## Add an action

One entry in `actions.ts`: `id`, `name`, `frames` (24 or 48, so ride wheels loop cleanly), `still`
(the hero frame) and `pose(f)`. A pose is `body`, `armL`, `armR`, `legs`, `eyes`, `eye`, `shadow`.
Arms and legs are offsets from the body, so a limb can't detach; leg tucks are clamped to 0..-2 rows
and arms move outward at most 3 cells. Add the id to `ActionId`.

## Rides from claude.dev

`scripts/extract-rides.ts` turned `public/runner/rides.json` into `items/ride-data.ts` once. Nothing
is decoded or fetched at runtime. Rerun it only to change the crop or origin of a ride.
