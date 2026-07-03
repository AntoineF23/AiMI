import type { ReactNode } from 'react'
import { Px } from '../ui/Px'

export function GameShell({
  title,
  icon,
  children,
  onClose
}: {
  title: string
  icon: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="game-shell hit">
      <div className="chat-header">
        <span className="chat-title">
          <Px name={icon} size={16} /> {title}
        </span>
        <button className="chat-close" onClick={onClose}>
          <Px name="xmark" size={12} />
        </button>
      </div>
      {children}
    </div>
  )
}
