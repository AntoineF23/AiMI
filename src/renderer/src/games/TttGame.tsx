import { useState } from 'react'
import { GameShell } from './GameShell'
import { Px } from '../ui/Px'
import { sfx } from '../game/sound'

type Cell = 'you' | 'pet' | null

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
]

function winner(b: Cell[]): Cell | 'draw' {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]
  }
  return b.every(Boolean) ? 'draw' : null
}

function bestMove(b: Cell[]): number {
  const free = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0)
  // personality blunder: sometimes the pet just vibes
  if (Math.random() < 0.25) return free[Math.floor(Math.random() * free.length)]
  const tryFind = (who: Cell): number => {
    for (const i of free) {
      const copy = [...b]
      copy[i] = who
      if (winner(copy) === who) return i
    }
    return -1
  }
  const win = tryFind('pet')
  if (win >= 0) return win
  const block = tryFind('you')
  if (block >= 0) return block
  if (!b[4]) return 4
  const corners = [0, 2, 6, 8].filter((i) => !b[i])
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)]
  return free[Math.floor(Math.random() * free.length)]
}

export function TttGame({ onEnd, onClose }: { onEnd: (score: number, max: number) => void; onClose: () => void }) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null))
  const [locked, setLocked] = useState(false)

  const finish = (result: Cell | 'draw'): void => {
    setLocked(true)
    setTimeout(() => onEnd(result === 'you' ? 3 : result === 'draw' ? 2 : 1, 3), 900)
  }

  const play = (i: number): void => {
    if (locked || board[i]) return
    const next = [...board]
    next[i] = 'you'
    sfx.pop()
    let w = winner(next)
    if (w) {
      setBoard(next)
      finish(w)
      return
    }
    setLocked(true)
    setBoard(next)
    setTimeout(() => {
      const petIdx = bestMove(next)
      const after = [...next]
      after[petIdx] = 'pet'
      sfx.pet()
      setBoard(after)
      w = winner(after)
      if (w) finish(w)
      else setLocked(false)
    }, 450)
  }

  const w = winner(board)

  return (
    <GameShell title="TIC TAC PAW" icon="paw" onClose={onClose}>
      <div className="ttt-grid">
        {board.map((cell, i) => (
          <button key={i} className="ttt-cell" onClick={() => play(i)} disabled={locked || !!cell || !!w}>
            {cell === 'you' && <Px name="heart" size={44} />}
            {cell === 'pet' && <Px name="paw" size={44} />}
          </button>
        ))}
      </div>
      <div className="game-hud">
        <span>
          YOU <Px name="heart" size={16} />
        </span>
        <span>{w === 'you' ? 'YOU WIN!' : w === 'pet' ? 'PET WINS!' : w === 'draw' ? 'DRAW!' : ''}</span>
        <span>
          PET <Px name="paw" size={16} />
        </span>
      </div>
    </GameShell>
  )
}
