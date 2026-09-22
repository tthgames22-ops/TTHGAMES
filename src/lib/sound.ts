let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15): void {
  const ctx = getCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

let soundEnabled = true

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled
}

export function playDiceRoll(): void {
  if (!soundEnabled) return
  for (let i = 0; i < 4; i++) {
    setTimeout(() => tone(200 + Math.random() * 200, 0.08, 'square', 0.08), i * 60)
  }
}

export function playMove(): void {
  if (!soundEnabled) return
  tone(440, 0.1, 'sine', 0.12)
  setTimeout(() => tone(550, 0.08, 'sine', 0.1), 80)
}

export function playCapture(): void {
  if (!soundEnabled) return
  tone(150, 0.15, 'sawtooth', 0.15)
  setTimeout(() => tone(100, 0.2, 'sawtooth', 0.12), 100)
}

export function playWin(): void {
  if (!soundEnabled) return
  const notes = [523, 659, 784, 1047]
  notes.forEach((n, i) => setTimeout(() => tone(n, 0.3, 'sine', 0.15), i * 150))
}

export function playClick(): void {
  if (!soundEnabled) return
  tone(800, 0.05, 'sine', 0.08)
}

export function playHome(): void {
  if (!soundEnabled) return
  tone(659, 0.1, 'sine', 0.12)
  setTimeout(() => tone(880, 0.15, 'sine', 0.12), 100)
}
