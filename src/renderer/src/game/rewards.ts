import type { Rarity, StickerDef } from '../../../shared/types'

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 62,
  uncommon: 24,
  rare: 10,
  epic: 3.4,
  legendary: 0.6
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9aa3b2',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24'
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY'
}

export const STICKERS: StickerDef[] = [
  { id: 'apple', name: 'Crispy Apple', rarity: 'common' },
  { id: 'cookie', name: 'Choco Cookie', rarity: 'common' },
  { id: 'clover', name: 'Lucky Clover', rarity: 'common' },
  { id: 'ball', name: 'Bouncy Ball', rarity: 'common' },
  { id: 'flower', name: 'Pixel Bloom', rarity: 'common' },
  { id: 'donut', name: 'Sprinkle Donut', rarity: 'common' },
  { id: 'paw', name: 'Paw Print', rarity: 'common' },
  { id: 'mug', name: 'Cozy Mug', rarity: 'common' },
  { id: 'cassette', name: 'Retro Tape', rarity: 'uncommon' },
  { id: 'boba', name: 'Boba Tea', rarity: 'uncommon' },
  { id: 'gamepad', name: 'Player One', rarity: 'uncommon' },
  { id: 'cactus', name: 'Hug Me Cactus', rarity: 'uncommon' },
  { id: 'sushi', name: 'Salmon Nigiri', rarity: 'uncommon' },
  { id: 'disco', name: 'Disco Ball', rarity: 'rare' },
  { id: 'rocket', name: 'To The Moon', rarity: 'rare' },
  { id: 'gem', name: 'Shiny Gem', rarity: 'rare' },
  { id: 'rainbow', name: 'Double Rainbow', rarity: 'rare' },
  { id: 'ufo', name: 'Tiny UFO', rarity: 'epic' },
  { id: 'crown', name: 'Royal Crown', rarity: 'epic' },
  { id: 'planet', name: 'Pocket Planet', rarity: 'epic' },
  { id: 'goldcat', name: 'Golden Unicorn', rarity: 'legendary' }
]

export const TREAT_ICONS = ['apple', 'cookie', 'donut', 'sushi', 'boba']

export interface Drop {
  kind: 'coins' | 'sticker'
  coins?: number
  sticker?: StickerDef
  isNew?: boolean
}

export function rollRarity(luckBoost = 1): Rarity {
  const entries = Object.entries(RARITY_WEIGHTS) as [Rarity, number][]
  const boosted = entries.map(([r, w]) => [r, r === 'common' ? w : w * luckBoost] as const)
  const total = boosted.reduce((s, [, w]) => s + w, 0)
  let roll = Math.random() * total
  for (const [rarity, weight] of boosted) {
    roll -= weight
    if (roll <= 0) return rarity
  }
  return 'common'
}

/**
 * Roll a drop. `chance` is the probability that anything drops at all.
 * Duplicate stickers convert to coins (never a dead reward).
 */
export function rollDrop(owned: string[], chance: number, luckBoost = 1): Drop | null {
  if (Math.random() > chance) return null
  const rarity = rollRarity(luckBoost)
  const pool = STICKERS.filter((s) => s.rarity === rarity)
  const sticker = pool[Math.floor(Math.random() * pool.length)]
  if (!sticker) return { kind: 'coins', coins: 10 }
  if (owned.includes(sticker.id)) {
    const dupCoins = { common: 5, uncommon: 12, rare: 30, epic: 80, legendary: 250 }[rarity]
    return { kind: 'coins', coins: dupCoins, sticker }
  }
  return { kind: 'sticker', sticker, isNew: true }
}

export const XP_REWARDS = {
  treat: () => 8 + Math.floor(Math.random() * 8),
  pet: () => 4 + Math.floor(Math.random() * 5),
  play: () => 10 + Math.floor(Math.random() * 10),
  talk: () => 6 + Math.floor(Math.random() * 6),
  gift: () => 20 + Math.floor(Math.random() * 15),
  daily: (streak: number) => 30 + Math.min(70, streak * 10)
}
