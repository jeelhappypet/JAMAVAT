"use client";

let audio: AudioContext | null = null;

/**
 * Browsers only allow sound after the user has tapped something on the
 * page, so the kitchen's "Sound on" button calls this first to unlock it.
 */
export async function unlockSound(): Promise<void> {
  if (typeof window === "undefined") return;
  audio ??= new AudioContext();
  if (audio.state === "suspended") await audio.resume().catch(() => undefined);
}

/** Two short tones — loud enough for a busy kitchen, no audio file to load. */
export function playNewOrderBeep() {
  if (!audio || audio.state !== "running") return;
  const start = audio.currentTime;
  [880, 1175].forEach((frequency, index) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    const t0 = start + index * 0.22;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    osc.connect(gain).connect(audio!.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  });
}
