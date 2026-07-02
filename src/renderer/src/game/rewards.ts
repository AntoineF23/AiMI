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
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare ✦',
  epic: 'Epic ✦✦',
  legendary: 'LEGENDARY ✦✦✦'
}

export const STICKERS: StickerDef[] = [
  { id: 'apple', emoji: '🍎', name: 'Crispy Apple', rarity: 'common' },
  { id: 'cookie', emoji: '🍪', name: 'Choco Cookie', rarity: 'common' },
  { id: 'leaf', emoji: '🍀', name: 'Lucky Clover', rarity: 'common' },
  { id: 'ball', emoji: '⚽', name: 'Bouncy Ball', rarity: 'common' },
  { id: 'flower', emoji: '🌸', name: 'Cherry Blossom', rarity: 'common' },
  { id: 'donut', emoji: '🍩', name: 'Sprinkle Donut', rarity: 'common' },
  { id: 'paw', emoji: '🐾', name: 'Paw Print', rarity: 'common' },
  { id: 'mug', emoji: '☕', name: 'Cozy Mug', rarity: 'common' },
  { id: 'cassette', emoji: '📼', name: 'Retro Tape', rarity: 'uncommon' },
  { id: 'boba', emoji: '🧋', name: 'Boba Tea', rarity: 'uncommon' },
  { id: 'controller', emoji: '🎮', name: 'Player One', rarity: 'uncommon' },
  { id: 'cactus', emoji: '🌵', name: 'Hug Me Cactus', rarity: 'uncommon' },
  { id: 'skate', emoji: '🛹', name: 'Kickflip Deck', rarity: 'uncommon' },
  { id: 'sushi', emoji: '🍣', name: 'Salmon Nigiri', rarity: 'uncommon' },
  { id: 'disco', emoji: '🪩', name: 'Disco Ball', rarity: 'rare' },
  { id: 'rocket', emoji: '🚀', name: 'To The Moon', rarity: 'rare' },
  { id: 'gem', emoji: '💎', name: 'Shiny Gem', rarity: 'rare' },
  { id: 'rainbow', emoji: '🌈', name: 'Double Rainbow', rarity: 'rare' },
  { id: 'ufo', emoji: '🛸', name: 'Tiny UFO', rarity: 'epic' },
  { id: 'crown', emoji: '👑', name: 'Royal Crown', rarity: 'epic' },
  { id: 'phoenix', emoji: '🐦‍🔥', name: 'Phoenix Feather', rarity: 'epic' },
  { id: 'galaxy', emoji: '🌌', name: 'Pocket Galaxy', rarity: 'legendary' },
  { id: 'unicorn', emoji: '🦄', name: 'Actual Unicorn', rarity: 'legendary' },
  { id: 'goldcat', emoji: '🐱', name: 'Golden AiMI', rarity: 'legendary' }
]

export const TREAT_EMOJIS = ['🍎', '🍪', '🍓', '🧀', '🍙', '🥐', '🍰', '🐟']

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
