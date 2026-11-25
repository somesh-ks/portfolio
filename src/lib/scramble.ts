/**
 * A split-flap pass over the text on screen: letters flip through code glyphs
 * and digits tick like a counter, then settle in a wave down the page. Used
 * when the tune toy switches typeface. Text nodes are only borrowed: each one
 * gets its own text back, and a node React rewrites mid-flip is left alone.
 */
const LETTER_GLYPHS = "01#$%&*+<=>@[]_{}~";
const DIGITS = "0123456789";
const FLIPS = /[\p{L}\p{N}]/u;
const SKIP = ".runner, .tune-exempt, svg, script, style, textarea, input, [contenteditable]";
const BLOCK = "p, li, h1, h2, h3, h4, dt, dd, figcaption";
/** Each character flips for FLIP ms, then the settling wave crosses the screen in WAVE ms. */
const FLIP = 140;
const WAVE = 320;
/** A new glyph every this many ms, so the flips read as flaps, not noise. */
const TICK = 45;

interface Run {
  node: Text;
  text: string;
  /** Settle time per character, in ms from the start. */
  settle: Float32Array;
  last: string;
}

const pick = (set: string) => set[Math.floor(Math.random() * set.length)]!;
const flip = (c: string) => (c >= "0" && c <= "9" ? pick(DIGITS) : pick(LETTER_GLYPHS));
const onScreen = (r: DOMRect) => r.width > 1 && r.bottom > 0 && r.top < innerHeight;

function collect(root: Element): { runs: Run[]; blocks: HTMLElement[] } {
  const nodes: Text[] = [];
  const blocks = new Map<HTMLElement, number>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const parent = n.parentElement;
      if (!parent || !n.nodeValue?.trim() || parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      return onScreen(parent.getBoundingClientRect())
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    nodes.push(node);
    const block = (node.parentElement!.closest(BLOCK) ?? node.parentElement!) as HTMLElement;
    if (!blocks.has(block)) blocks.set(block, block.getBoundingClientRect().height);
  }
  // Glyphs are narrower than letters; holding each block's height keeps the page from jumping.
  for (const [block, height] of blocks) block.style.blockSize = `${height}px`;

  const total = nodes.reduce((sum, n) => sum + n.data.length, 0) || 1;
  let index = 0;
  const runs = nodes.map((node) => {
    const settle = new Float32Array(node.data.length);
    for (let i = 0; i < settle.length; i++) settle[i] = FLIP + (index++ / total) * WAVE;
    return { node, text: node.data, settle, last: node.data };
  });
  return { runs, blocks: [...blocks.keys()] };
}

/**
 * Flips the text in `root` at once and settles it after `ready` (a font load,
 * say). Returns a function that stops the pass and puts all text back.
 */
export function scramble(root: Element, ready: Promise<unknown> = Promise.resolve()): () => void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  let done = false;
  let frame = 0;
  let runs: Run[] = [];
  let blocks: HTMLElement[] = [];

  const restore = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    for (const run of runs) if (run.node.data === run.last) run.node.data = run.text;
    for (const block of blocks) block.style.blockSize = "";
    root.removeAttribute("aria-busy");
    document.removeEventListener("visibilitychange", restore);
  };

  // A hidden tab stops animation frames; never leave it holding scrambled text.
  document.addEventListener("visibilitychange", restore);
  root.setAttribute("aria-busy", "true");

  ({ runs, blocks } = collect(root));
  if (!runs.length) {
    restore();
    return restore;
  }
  // Everything flips until the new face is ready; the settling clock starts then.
  let start = Infinity;
  let tick = -1;
  const settle = () => {
    if (done) return;
    // The new face may wrap differently: re-hold each block at its real height,
    // measured with the real text, all before the next paint.
    for (const run of runs) if (run.node.data === run.last) run.node.data = run.last = run.text;
    for (const block of blocks) block.style.blockSize = "";
    const heights = blocks.map((block) => block.getBoundingClientRect().height);
    blocks.forEach((block, i) => (block.style.blockSize = `${heights[i]}px`));
    tick = -1;
    start = performance.now();
  };
  // A failed font load still settles the text, in whatever face the page fell back to.
  ready.then(settle, settle);
  const step = (now: number) => {
    const t = Math.max(0, now - start);
    if (t >= FLIP + WAVE) return restore();
    const nextTick = Math.floor(now / TICK);
    if (nextTick !== tick) {
      tick = nextTick;
      for (const run of runs) {
        if (run.node.data !== run.last) continue;
        let out = "";
        for (let i = 0; i < run.text.length; i++) {
          const c = run.text[i]!;
          out += t < run.settle[i]! && FLIPS.test(c) ? flip(c) : c;
        }
        run.node.data = run.last = out;
      }
    }
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return restore;
}
