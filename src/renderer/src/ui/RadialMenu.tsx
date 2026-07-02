import type { Anchor } from '../hooks/useGame'
import type { GameState } from '../../../shared/types'
import { levelProgress } from '../game/xp'

interface Props {
  anchor: Anchor
  state: GameState
  onTreat: () => void
  onPet: () => void
  onPlay: () => void
  onTalk: () => void
  onAlbum: () => void
  onClose: () => void
}

const ITEMS: { key: string; emoji: string; label: string; angle: number }[] = [
  { key: 'treat', emoji: '🍎', label: 'Treat', angle: -162 },
  { key: 'pet', emoji: '❤️', label: 'Pet', angle: -126 },
  { key: 'play', emoji: '🎮', label: 'Play', angle: -90 },
  { key: 'talk', emoji: '💬', label: 'Talk', angle: -54 },
  { key: 'album', emoji: '📖', label: 'Album', angle: -18 }
]

export function RadialMenu({ anchor, state, onTreat, onPet, onPlay, onTalk, onAlbum, onClose }: Props) {
  const handlers: Record<string, () => void> = {
    treat: onTreat,
    pet: onPet,
    play: onPlay,
    talk: onTalk,
    album: onAlbum
  }
  const radius = 86
  const cx = Math.min(window.innerWidth - radius - 40, Math.max(radius + 40, anchor.x))
  const cy = anchor.y + 30
  const prog = levelProgress(state.totalXp)

  return (
    <div className="radial hit" style={{ left: cx, top: cy }} onContextMenu={(e) => e.preventDefault()}>
      <div className="radial-pad" onClick={onClose} />
      {ITEMS.map((item) => {
        const rad = (item.angle * Math.PI) / 180
        const x = Math.cos(rad) * radius
        const y = Math.sin(rad) * radius
        return (
          <button
            key={item.key}
            className="radial-btn"
            style={{ transform: `translate(${x}px, ${y}px)` }}
            onClick={handlers[item.key]}
          >
            <span className="radial-emoji">{item.emoji}</span>
            <span className="radial-label">{item.label}</span>
          </button>
        )
      })}
      <div className="hud-pill" style={{ transform: `translate(-50%, ${-radius - 74}px)` }}>
        <span className="hud-level">Lv {prog.level}</span>
        <span className="hud-bar">
          <span className="hud-bar-fill" style={{ width: `${Math.round(prog.ratio * 100)}%` }} />
        </span>
        <span>🪙 {state.coins}</span>
        {state.streak.count > 1 && <span>🔥 {state.streak.count}</span>}
      </div>
    </div>
  )
}
