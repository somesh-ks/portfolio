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
| `handL`  | the left arm; draw the object and its grip | mug, flag, balloon           |
| `front`  | the body, held with both arms              | laptop, book, console, plate |
| `ground` | the ground line, no bob                    | signs, ships                 |
| `lane`   | fixed lane at the upper right of the head  | every effect                 |
| `ride`   | the body, never below the ground           | skate, scooter, bike, Dala   |

`claims` says which limbs an item takes over:

- `claims: "arms"` (front items): both arms ignore the action and use `hold(f)`, an offset per arm
  relative to the body. Each hand must touch the item (a test checks it).
- `claims: "legs"` (rides): the legs ignore the action. `seat: "stand"` keeps them visible on the
  ride, `"hide"` tucks them behind its front layer. `ground` is the ground line for the shadow.
  A ride's `rider(f, n)` returns the pose that seats Claude: a torso nudge and an offset (or null,
  hidden) for each arm and leg from its rest slot. A limb the pose omits (the skateboard's arms) follows the action. A posed arm holds
  its spot (the bar, the horse's neck, hidden behind the torso) while the action leaves it flat; an arm the
  action raises (`up`, `bent`: wave, cheer, jump, shrug) follows the action instead. The torso still bobs, the
  eyes still blink, and their combined glance is clamped to the torso so they never leave the face. `thumb`
  overrides the parts of a ride's picker thumbnail (the vehicle alone, rider cells removed, frame gaps closed). The vehicle is `parts` drawn at
  its original place in front of the body; wheel states switch by frame with `at`. `eye` is the
  eyes' base glance (looking ahead), `handL` where the left hand appears when a hand item needs it.
- Items are the object only. A `handL` item has no hand in its art: the rig draws a fist over the
  grip. Body-coloured cells in art are refused by a test (the VIP pass and laptop logo excepted);
  ride-owned fill that completes a posed rider is a part marked `body: true`, left out of thumbnails.
- Effects (`lane`) live at the upper right of the head (x 21..31, y -18..-1) and follow the body. Every particle must sit within two cells of the head corner or of the particle before it, or the die-cut splits into islands (a test checks it); build them as a chain that grows with the loop. They loop over the action's
  frame count: give each particle `at(f, n)` returning `[dx, dy]` or `null` to hide it.

Optional per entry: `layers` (hand-built rects, for alpha), `parts` (several pieces), `pose(f, n)`,
`eyeTint`, `z`. Keep an item under about 60 rects.

Then:

1. `bun test tests/unit/stickers.test.ts`. It runs every action alone with the item and in
   colliding pairs, outline off and thin: the body stays one piece, limbs overlap the torso, held
   items touch the hands, nothing but a face item covers the eyes, bounds stay within 48 x 48 cells.
2. `bun scripts/sticker-sheet.ts` writes `engine-sheet.png` (and a dark one, a combo sheet and
   `rides-sheet.png`) to `/mnt/project-files/sticker-studio/v3/`. `bun scripts/sticker-thumbs.ts` renders the picker thumbnails on light and dark tiles. Look at it: hats sit on the head, held things sit in
   the hand, rides sit under the body.

## Add an action

One entry in `actions.ts`: `id`, `name`, `frames` (24 or 48, so ride wheels loop cleanly), `still`
(the hero frame) and `pose(f)`. A pose is `body`, `armL`, `armR`, `legs`, `eyes`, `eye`, `shadow`.
Arms and legs are offsets from the body, so a limb can't detach; leg tucks are clamped to 0..-1 rows so every leg shows at least two rows
and arms move outward at most 3 cells. Add the id to `ActionId`.

Arms have three shapes, picked per frame with `shapeL` / `shapeR`: `flat` (default), `bent` (the flat arm
with a hand standing up on its end: shrug, run, dance) and `up` (a vertical 2 x 8 arm on the shoulder:
wave, cheer, jump, peek, dance). Each shape is its own part (`armL`, `armL_bent`, `armL_up`, roots
`armL_root`, `armL_up_root`), one visible per frame, so tests read an arm as the union. A hand item
follows the left hand's point in the current shape (`HAND_AT` in `rig.ts`). Rides and front items place
the arms themselves and ignore shapes; a ride's rider never sinks more than one row. `legsX` shifts each
leg up to one cell from the body (planted feet in a lean, a wide stride). The picker's action thumbnails
(not exports) also carry small motion marks (`MARKS` in `svg.ts`) for wave, nod, walk and run.

## Rides from claude.dev

`scripts/extract-rides.ts` turned `public/runner/rides.json` into `items/ride-data.ts` once. Nothing
is decoded or fetched at runtime. It uses `scripts/ride-fit.ts`, which fits our rig (torso, arms,
legs; each a small integer offset or hidden) to the original sprite's mascot cells on every loop
frame and prints what is left over: cells the rig can't reach become body-coloured fill, cells it
paints on empty are the residual. Now: skate 0, scooter 1, bike up to 6 (of about 190 cells).
`tests/unit/stickers.test.ts` renders each ride at idle and compares it to the decoded original.
Rerun it only to change a ride's spec.
