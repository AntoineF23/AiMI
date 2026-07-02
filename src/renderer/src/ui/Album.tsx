import { useEffect } from 'react'
import type { GameState } from '../../../shared/types'
import { STICKERS, RARITY_COLORS } from '../game/rewards'
import { Px } from './Px'

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
        <Px name="book" size={16} />
        <span className="album-title">STICKER ALBUM</span>
        <span className="album-count">
          {owned.size}/{STICKERS.length}
        </span>
        <span className="album-coins">
          <Px name="coin" size={16} /> {state.coins}
        </span>
        <button className="album-close" onClick={onClose}>
          <Px name="xmark" size={16} />
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
              <Px name={has ? s.id : 'question'} size={32} />
              <span className="album-name">{has ? s.name : '???'}</span>
            </div>
          )
        })}
      </div>
      <div className="album-footer">COLLECT THEM ALL! RARER STICKERS DROP FROM GIFTS &amp; TREATS</div>
    </div>
  )
}
