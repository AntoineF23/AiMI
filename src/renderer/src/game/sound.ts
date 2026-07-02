import type { Rarity } from '../../../shared/types'

/**
 * Zero-asset chiptune synth. All AiMI sounds are tiny WebAudio envelopes so
 * the package ships with no audio files and stays instant.
 */
let ctx: AudioContext | null = null
let muted = false

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setMuted(m: boolean): void {
  muted = m
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', peak = 0.12): void {
  if (muted) return
  const a = ac()
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = a.currentTime + start
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export const sfx = {
  pop(): void {
    tone(520, 0, 0.07, 'square', 0.08)
    tone(780, 0.03, 0.06, 'square', 0.06)
  },
  xp(): void {
    tone(880, 0, 0.05, 'square', 0.05)
    tone(1175, 0.04, 0.07, 'square', 0.05)
  },
  munch(): void {
    tone(220, 0, 0.05, 'sawtooth', 0.08)
    tone(180, 0.09, 0.05, 'sawtooth', 0.08)
    tone(240, 0.18, 0.05, 'sawtooth', 0.08)
  },
  pet(): void {
    tone(660, 0, 0.09, 'sine', 0.09)
    tone(990, 0.06, 0.12, 'sine', 0.07)
  },
  reward(rarity: Rarity): void {
    const base: Record<Rarity, number[]> = {
      common: [660, 880],
      uncommon: [660, 880, 1100],
      rare: [523, 659, 784, 1047],
      epic: [523, 659, 784, 1047, 1319],
      legendary: [523, 659, 784, 1047, 1319, 1568, 2093]
    }
    base[rarity].forEach((f, i) => tone(f, i * 0.07, 0.12, 'square', 0.09))
  },
  levelUp(): void {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319]
    notes.forEach((f, i) => tone(f, i * 0.09, 0.16, 'square', 0.1))
    tone(2093, notes.length * 0.09, 0.4, 'triangle', 0.08)
  },
  gift(): void {
    tone(392, 0, 0.08, 'triangle', 0.1)
    tone(523, 0.08, 0.08, 'triangle', 0.1)
    tone(659, 0.16, 0.14, 'triangle', 0.1)
  }
}
