export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface StickerDef {
  /** id doubles as the pixel-icon filename in /px */
  id: string
  name: string
  rarity: Rarity
}

export interface GameState {
  version: 1
  petName: string
  totalXp: number
  coins: number
  streak: { count: number; lastDay: string }
  stickers: string[]
  lastDailyGift: string
  muted: boolean
  onboardedAt: string
  bestScores: Record<string, number>
  accessory: string
  /** legacy user-picked skin id — superseded by `color` */
  skin: string
  /** coat color id, rolled at hatch, permanent */
  color: string
  createdAt: string
}

export const DEFAULT_GAME_STATE: GameState = {
  version: 1,
  petName: 'AiMI',
  totalXp: 0,
  coins: 0,
  streak: { count: 0, lastDay: '' },
  stickers: [],
  lastDailyGift: '',
  muted: false,
  onboardedAt: '',
  bestScores: {},
  accessory: '',
  skin: '',
  color: '',
  createdAt: new Date().toISOString()
}

/**
 * Coat colors: rolled ONCE when the egg hatches (rarity-weighted) and never
 * user-changeable — a unicorn's color is its destiny.
 */
export interface UnicornColor {
  id: string
  label: string
  rarity: Rarity
  weight: number
}

export const UNICORN_COLORS: UnicornColor[] = [
  { id: 'snow', label: 'SNOW', rarity: 'common', weight: 26 },
  { id: 'rose', label: 'ROSE', rarity: 'common', weight: 26 },
  { id: 'storm', label: 'STORM', rarity: 'common', weight: 26 },
  { id: 'mint', label: 'FROST', rarity: 'uncommon', weight: 8 },
  { id: 'ember', label: 'EMBER', rarity: 'uncommon', weight: 8 },
  { id: 'lilac', label: 'LILAC', rarity: 'uncommon', weight: 8 },
  { id: 'gold', label: 'GOLDEN', rarity: 'rare', weight: 3 },
  { id: 'midnight', label: 'MIDNIGHT', rarity: 'legendary', weight: 1 }
]

export function rollUnicornColor(): UnicornColor {
  const total = UNICORN_COLORS.reduce((s, c) => s + c.weight, 0)
  let roll = Math.random() * total
  for (const c of UNICORN_COLORS) {
    roll -= c.weight
    if (roll <= 0) return c
  }
  return UNICORN_COLORS[0]
}

/** Growth stages: the unicorn matures with its level (art + size). */
export function stageForLevel(level: number): { stage: number; scale: number; name: string } {
  if (level < 4) return { stage: 1, scale: 3, name: 'FOAL' }
  if (level < 10) return { stage: 2, scale: 3, name: 'YEARLING' }
  if (level < 18) return { stage: 3, scale: 4, name: 'UNICORN' }
  return { stage: 4, scale: 5, name: 'LEGENDARY UNICORN' }
}
