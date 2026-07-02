import type { ToastItem, PopupItem, UiState } from '../hooks/useGame'
import { RARITY_COLORS, RARITY_LABELS } from '../game/rewards'

export function Toasts({ toasts }: { toasts: ToastItem[] }) {
  return (
    <>
      {toasts.map((t) => (
        <div key={t.id} className="toast" style={{ left: t.x, top: t.y }}>
          {t.text}
        </div>
      ))}
    </>
  )
}

export function RewardPopup({ popup }: { popup: PopupItem }) {
  const color = RARITY_COLORS[popup.rarity]
  return (
    <div className="reward-popup" style={{ borderColor: color, boxShadow: `0 0 24px ${color}55` }}>
      <div className="reward-emoji">{popup.emoji}</div>
      <div className="reward-text">
        <div className="reward-rarity" style={{ color }}>
          {RARITY_LABELS[popup.rarity]}
          {popup.isNew && <span className="reward-new">NEW!</span>}
        </div>
        <div className="reward-title">{popup.title}</div>
        <div className="reward-subtitle">{popup.subtitle}</div>
      </div>
    </div>
  )
}

export function LevelUpBanner({ level, coins }: { level: number; coins: number }) {
  return (
    <div className="levelup">
      <div className="levelup-stars">⭐ ⭐ ⭐</div>
      <div className="levelup-title">LEVEL {level}!</div>
      <div className="levelup-sub">+{coins} 🪙 bonus</div>
    </div>
  )
}

export function Bubble({ bubble }: { bubble: NonNullable<UiState['bubble']> }) {
  const x = Math.min(window.innerWidth - 140, Math.max(140, bubble.anchor.x))
  return (
    <div className="bubble hit" style={{ left: x, top: bubble.anchor.y - 26 }}>
      {bubble.text}
      <div className="bubble-tail" />
    </div>
  )
}

export function GiftBox({ x, onOpen }: { x: number; onOpen: () => void }) {
  return (
    <button className="gift hit" style={{ left: x }} onClick={onOpen} title="A present appeared!">
      🎁
    </button>
  )
}
