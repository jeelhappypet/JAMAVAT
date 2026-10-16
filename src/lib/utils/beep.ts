"use client";

let audio: AudioContext | null = null;
let output: AudioNode | null = null;

/**
 * Browsers only allow sound after the user has tapped something on the
 * page, so the kitchen's "Sound on" button calls this first to unlock it.
 */
export async function unlockSound(): Promise<void> {
  if (typeof window === "undefined") return;
  audio ??= new AudioContext();
  if (audio.state === "suspended") await audio.resume().catch(() => undefined);
}

/**
 * Full volume out of the page: a compressor squeezes the chime's peaks so
 * the master gain can sit at 1 without clipping. (A web page can't turn up
 * the device's own volume — this is as loud as the browser lets us be.)
 */
function loudOutput(ctx: AudioContext): AudioNode {
  if (output) return output;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 0;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.12;
  const master = ctx.createGain();
  master.gain.value = 1;
  compressor.connect(master).connect(ctx.destination);
  output = compressor;
  return output;
}

/** One bell strike: a bright fundamental plus two overtones, fast attack, ringing decay. */
function bell(ctx: AudioContext, dest: AudioNode, frequency: number, t0: number, length: number) {
  const partials: [number, number, OscillatorType][] = [
    [1, 1, "triangle"],
    [2, 0.4, "sine"],
    [3, 0.18, "sine"],
  ];
  for (const [multiple, level, type] of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency * multiple;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(level, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
    osc.connect(gain).connect(dest);
    osc.start(t0);
    osc.stop(t0 + length + 0.05);
  }
}

/** C6 · E6 · G6 — a rising "ding-ding-ding". */
const CHIME = [1046.5, 1318.5, 1568];

/**
 * New-order chime, played twice: loud, bright and unlike any phone ringtone,
 * so it cuts through a busy kitchen. No audio file to load. Phones also buzz.
 */
export function playNewOrderBeep() {
  if (typeof navigator !== "undefined") navigator.vibrate?.([250, 120, 250, 120, 400]);
  if (!audio || audio.state !== "running") return;
  const dest = loudOutput(audio);
  const start = audio.currentTime + 0.02;
  for (let round = 0; round < 2; round++) {
    CHIME.forEach((frequency, index) => bell(audio!, dest, frequency, start + round * 0.85 + index * 0.15, 0.7));
  }
}
