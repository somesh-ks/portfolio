/**
 * A tiny Web Audio synth for UI sound. Original sounds, made from oscillators
 * and one shared noise buffer, so there are no files to download.
 *
 * - One AudioContext for the whole site, created inside a user gesture
 *   (`unlock`) so mobile Safari lets it run.
 * - Every voice is a one-shot: source, gain, (filter), started and stopped
 *   on the audio clock, then disconnected when it ends. Nothing keeps rendering.
 * - A 4 ms attack and an exponential tail on every voice, so nothing clicks.
 */

export type SoundName =
  | "tap"
  | "tick"
  | "pop"
  | "toggle"
  | "toggleOff"
  | "start"
  | "jump"
  | "milestone"
  | "crash";

interface Voice {
  wave: OscillatorType | "noise";
  /** Start and end pitch in Hz; noise uses it as a band-pass centre. */
  from: number;
  to?: number;
  /** Seconds until the voice has faded out. */
  decay: number;
  gain: number;
  /** Seconds after the trigger. */
  delay?: number;
}

const SOUNDS: Record<SoundName, Voice[]> = {
  tap: [{ wave: "noise", from: 3400, decay: 0.022, gain: 0.09 }],
  tick: [{ wave: "triangle", from: 1700, decay: 0.016, gain: 0.05 }],
  pop: [{ wave: "sine", from: 880, to: 340, decay: 0.08, gain: 0.14 }],
  toggle: [{ wave: "sine", from: 540, to: 800, decay: 0.07, gain: 0.12 }],
  toggleOff: [{ wave: "sine", from: 800, to: 520, decay: 0.07, gain: 0.1 }],
  start: [
    { wave: "triangle", from: 520, decay: 0.06, gain: 0.08 },
    { wave: "triangle", from: 780, decay: 0.08, gain: 0.08, delay: 0.06 },
  ],
  jump: [{ wave: "square", from: 330, to: 660, decay: 0.07, gain: 0.035 }],
  milestone: [
    { wave: "square", from: 880, decay: 0.06, gain: 0.03 },
    { wave: "square", from: 1320, decay: 0.1, gain: 0.03, delay: 0.07 },
  ],
  crash: [
    { wave: "square", from: 220, to: 70, decay: 0.24, gain: 0.045 },
    { wave: "noise", from: 900, decay: 0.12, gain: 0.08 },
  ],
};

const ATTACK = 0.004;
/** The same sound twice inside this window plays once (key repeat, double fires). */
const REPEAT_MS = 45;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
const lastPlayed = new Map<SoundName, number>();
/** performance.now() of the last sound, so a click handler can tell it already sounded. */
let lastAny = -Infinity;

/** Creates or wakes the context. Call it synchronously inside a user gesture. */
export function unlock(): void {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  if (!context) {
    try {
      context = new AudioContext({ latencyHint: "interactive" });
      master = context.createGain();
      master.gain.value = 0.9;
      master.connect(context.destination);
    } catch {
      // The browser refused a context (too many open): stay silent, never block the action.
      context = null;
      master = null;
      return;
    }
  }
  // "suspended" before a gesture, "interrupted" on iOS after a call or a lock.
  if (context.state !== "running") void context.resume().catch(() => {});
}

/** Stops the audio thread while the tab is hidden; `unlock` wakes it. */
export function sleep(): void {
  if (context?.state === "running") void context.suspend().catch(() => {});
}

export function playedSince(time: number): boolean {
  return lastAny >= time;
}

function noiseBuffer(audio: AudioContext): AudioBuffer {
  if (noise) return noise;
  const length = Math.floor(audio.sampleRate * 0.25);
  noise = audio.createBuffer(1, length, audio.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function voice(audio: AudioContext, out: AudioNode, spec: Voice, now: number): void {
  const start = now + (spec.delay ?? 0);
  const end = start + spec.decay;
  const amp = audio.createGain();
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(spec.gain, start + ATTACK);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  amp.connect(out);

  let source: AudioScheduledSourceNode;
  let filter: BiquadFilterNode | null = null;
  if (spec.wave === "noise") {
    const buffer = audio.createBufferSource();
    buffer.buffer = noiseBuffer(audio);
    filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = spec.from;
    filter.Q.value = 1.2;
    buffer.connect(filter).connect(amp);
    source = buffer;
  } else {
    const osc = audio.createOscillator();
    osc.type = spec.wave;
    osc.frequency.setValueAtTime(spec.from, start);
    if (spec.to) osc.frequency.exponentialRampToValueAtTime(spec.to, end);
    osc.connect(amp);
    source = osc;
  }
  source.addEventListener(
    "ended",
    () => {
      source.disconnect();
      filter?.disconnect();
      amp.disconnect();
    },
    { once: true },
  );
  source.start(start);
  source.stop(end + 0.02);
}

export function play(name: SoundName): void {
  const nowMs = performance.now();
  lastAny = nowMs;
  if (nowMs - (lastPlayed.get(name) ?? -Infinity) < REPEAT_MS) return;
  lastPlayed.set(name, nowMs);
  unlock();
  if (!context || !master) return;
  const now = context.currentTime + 0.005;
  try {
    for (const spec of SOUNDS[name]) voice(context, master, spec, now);
  } catch {
    // A closed or broken context: sound is optional, the click still works.
  }
}
