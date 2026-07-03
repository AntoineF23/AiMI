import type { GameState } from '../../../shared/types'
import { Px } from '../ui/Px'
import { levelFromXp } from '../game/xp'

export type GameId = 'catch' | 'pong' | 'ttt'

export const HATS: { id: string; label: string; unlockLevel: number }[] = [
  { id: 'hat-party', label: 'PARTY', unlockLevel: 3 },
  { id: 'hat-bow', label: 'BOW', unlockLevel: 6 },
  { id: 'hat-crown', label: 'CROWN', unlockLevel: 10 }
]

const GAMES: { id: GameId; icon: string; label: string }[] = [
  { id: 'catch', icon: 'apple', label: 'CATCH THE TREAT' },
  { id: 'pong', icon: 'gamepad', label: 'PONG VS PET' },
  { id: 'ttt', icon: 'paw', label: 'TIC TAC PAW' }
]

interface Props {
  state: GameState
  onStart: (id: GameId) => void
  onZoomies: () => void
  onHat: (id: string | null) => void
  onClose: () => void
}

export function GamesMenu({ state, onStart, onZoomies, onHat, onClose }: Props) {
  const level = levelFromXp(state.totalXp)
  return (
    <div className="games-menu hit">
      <div className="chat-header">
        <span className="chat-title">
          <Px name="gamepad" size={18} /> PLAYTIME
        </span>
        <button className="chat-close" onClick={onClose}>
          <Px name="xmark" size={14} />
        </button>
      </div>
      <div className="games-list">
        {GAMES.map((g) => (
          <button key={g.id} className="games-item" onClick={() => onStart(g.id)}>
            <Px name={g.icon} size={30} />
            <span>{g.label}</span>
            {state.bestScores?.[g.id] !== undefined && (
              <span className="games-best">
                <Px name="trophy" size={16} /> {state.bestScores[g.id]}
              </span>
            )}
          </button>
        ))}
        <button className="games-item" onClick={onZoomies}>
          <Px name="star" size={30} />
          <span>JUST ZOOMIES</span>
        </button>
      </div>
      <div className="games-hats">
        <div className="games-hats-title">WARDROBE</div>
        <div className="games-hats-row">
          <button className={`chip${!state.accessory ? ' active' : ''}`} onClick={() => onHat(null)}>
            NO HAT
          </button>
          {HATS.map((h) => {
            const unlocked = level >= h.unlockLevel
            return (
              <button
                key={h.id}
                className={`chip${state.accessory === h.id ? ' active' : ''}`}
                disabled={!unlocked}
                title={unlocked ? h.label : `Unlocks at level ${h.unlockLevel}`}
                onClick={() => onHat(h.id)}
              >
                {unlocked ? h.label : `LV${h.unlockLevel}`}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
