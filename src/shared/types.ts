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
  createdAt: new Date().toISOString()
}
