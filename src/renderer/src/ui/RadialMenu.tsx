import type { Anchor } from '../hooks/useGame'
import type { GameState } from '../../../shared/types'
import { levelProgress } from '../game/xp'
import { Px } from './Px'

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

const ITEMS: { key: string; icon: string; label: string; angle: number }[] = [
  { key: 'treat', icon: 'apple', label: 'TREAT', angle: -170 },
  { key: 'pet', icon: 'heart', label: 'PET', angle: -138 },
  { key: 'play', icon: 'gamepad', label: 'PLAY', angle: -106 },
  { key: 'talk', icon: 'bubble', label: 'TALK', angle: -74 },
  { key: 'album', icon: 'book', label: 'ALBUM', angle: -42 },
  { key: 'settings', icon: 'gear', label: 'SETUP', angle: -10 }
]

export function RadialMenu({ anchor, state, onTreat, onPet, onPlay, onTalk, onAlbum, onClose }: Props) {
  const handlers: Record<string, () => void> = {
    treat: onTreat,
    pet: onPet,
    play: onPlay,
    talk: onTalk,
    album: onAlbum,
    settings: () => {
      window.aimi.openSettings()
      onClose()
    }
  }
  const radius = 106
  const cx = Math.min(window.innerWidth - radius - 48, Math.max(radius + 48, anchor.x))
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
            <Px name={item.icon} size={16} />
            <span className="radial-label">{item.label}</span>
          </button>
        )
      })}
      <div className="hud-pill" style={{ transform: `translate(-50%, ${-radius - 78}px)` }}>
        <span className="hud-level">LV{prog.level}</span>
        <span className="hud-bar">
          <span className="hud-bar-fill" style={{ width: `${Math.round(prog.ratio * 100)}%` }} />
        </span>
        <Px name="coin" size={16} />
        <span>{state.coins}</span>
        {state.streak.count > 1 && (
          <>
            <Px name="star" size={16} />
            <span>{state.streak.count}</span>
          </>
        )}
      </div>
    </div>
  )
}
