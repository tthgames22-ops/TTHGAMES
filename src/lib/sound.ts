// Lightweight Web Audio API sound effects — no asset files needed.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15, delay = 0) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ac.currentTime + delay;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export const sfx = {
  click: () => tone(420, 0.08, 'triangle', 0.12),
  roll: () => {
    for (let i = 0; i < 4; i++) tone(180 + Math.random() * 120, 0.06, 'square', 0.08, i * 0.07);
  },
  move: () => tone(660, 0.1, 'triangle', 0.12),
  enter: () => {
    tone(523, 0.12, 'triangle', 0.14);
    tone(784, 0.14, 'triangle', 0.14, 0.1);
  },
  cut: () => {
    tone(200, 0.18, 'sawtooth', 0.18);
    tone(120, 0.22, 'sawtooth', 0.16, 0.08);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.12));
  },
  home: () => {
    tone(784, 0.12, 'sine', 0.14);
    tone(1047, 0.16, 'sine', 0.14, 0.1);
  },
  error: () => tone(150, 0.2, 'sawtooth', 0.12),
};

let muted = false;
export function setMuted(m: boolean) { muted = m; }
export function isMuted() { return muted; }
