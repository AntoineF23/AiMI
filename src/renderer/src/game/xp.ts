/** Cumulative XP required to reach a given level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.round(80 * Math.pow(level - 1, 1.5))
}

export function levelFromXp(totalXp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= totalXp) level++
  return level
}

export interface LevelProgress {
  level: number
  current: number
  needed: number
  ratio: number
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelFromXp(totalXp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return {
    level,
    current: totalXp - base,
    needed: next - base,
    ratio: (totalXp - base) / (next - base)
  }
}
