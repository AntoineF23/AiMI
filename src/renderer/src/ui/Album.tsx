import { useEffect } from 'react'
import type { GameState } from '../../../shared/types'
import { STICKERS, RARITY_COLORS } from '../game/rewards'

export function Album({ state, onClose }: { state: GameState; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const owned = new Set(state.stickers)

  return (
    <div className="album hit">
      <div className="album-header">
        <span className="album-title">📖 Sticker Album</span>
        <span className="album-count">
          {owned.size}/{STICKERS.length}
        </span>
        <span className="album-coins">🪙 {state.coins}</span>
        <button className="album-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="album-grid">
        {STICKERS.map((s) => {
          const has = owned.has(s.id)
          return (
            <div
              key={s.id}
              className={`album-cell${has ? '' : ' locked'}`}
              style={has ? { borderColor: RARITY_COLORS[s.rarity] } : undefined}
              title={has ? s.name : '???'}
            >
              <span className="album-emoji">{has ? s.emoji : '❓'}</span>
              <span className="album-name">{has ? s.name : '???'}</span>
            </div>
          )
        })}
      </div>
      <div className="album-footer">Collect them all! Rarer stickers drop from gifts &amp; treats ✨</div>
    </div>
  )
}
