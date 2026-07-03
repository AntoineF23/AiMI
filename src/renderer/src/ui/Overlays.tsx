import type { ToastItem, PopupItem, UiState } from '../hooks/useGame'
import { RARITY_COLORS, RARITY_LABELS } from '../game/rewards'
import { Px } from './Px'

export function Toasts({ toasts }: { toasts: ToastItem[] }) {
  return (
    <>
      {toasts.map((t) => (
        <div key={t.id} className="toast" style={{ left: t.x, top: t.y }}>
          {t.icon && <Px name={t.icon} size={36} />}
          {t.text}
        </div>
      ))}
    </>
  )
}

export function RewardPopup({ popup }: { popup: PopupItem }) {
  const color = RARITY_COLORS[popup.rarity]
  return (
    <div className="reward-popup" style={{ borderColor: color }}>
      <Px name={popup.icon} size={48} />
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
      <div className="levelup-stars">
        <Px name="star" size={32} />
        <Px name="star" size={44} />
        <Px name="star" size={32} />
      </div>
      <div className="levelup-title">LEVEL {level}!</div>
      <div className="levelup-sub">
        +{coins} <Px name="coin" size={16} /> BONUS
      </div>
    </div>
  )
}

export function Bubble({
  bubble,
  onClick,
  onApprove,
  onDecline
}: {
  bubble: NonNullable<UiState['bubble']>
  onClick?: () => void
  onApprove?: () => void
  onDecline?: () => void
}) {
  const x = Math.min(window.innerWidth - 140, Math.max(140, bubble.anchor.x))
  const isAsk = bubble.kind === 'ask_screenshot'
  return (
    <div
      className="bubble hit"
      style={{ left: x, top: bubble.anchor.y - 26 }}
      onClick={isAsk ? undefined : onClick}
    >
      {bubble.text}
      {isAsk ? (
        <div className="bubble-actions">
          <button className="bubble-btn yes" onClick={onApprove}>
            SURE, PEEK
          </button>
          <button className="bubble-btn" onClick={onDecline}>
            NOT NOW
          </button>
        </div>
      ) : (
        onClick && <div className="bubble-cta">CLICK TO ANSWER</div>
      )}
      <div className="bubble-tail" />
    </div>
  )
}

export function GiftBox({ x, onOpen }: { x: number; onOpen: () => void }) {
  return (
    <button className="gift hit" style={{ left: x }} onClick={onOpen} title="A present appeared!">
      <Px name="gift" size={64} />
    </button>
  )
}
