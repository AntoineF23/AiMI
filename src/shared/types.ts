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
  skin: string
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
  skin: 'default',
  createdAt: new Date().toISOString()
}

export const BUILTIN_SKINS = [
  { id: 'default', label: 'CLASSIC' },
  { id: 'mint', label: 'MINTY' },
  { id: 'peach', label: 'PEACHY' }
]

/** Evolution stages: the pet grows with its level. */
export function stageForLevel(level: number): { stage: number; scale: number; name: string } {
  if (level < 4) return { stage: 1, scale: 3, name: 'HATCHLING' }
  if (level < 10) return { stage: 2, scale: 4, name: 'KIDDO' }
  return { stage: 3, scale: 5, name: 'CHONK' }
}
