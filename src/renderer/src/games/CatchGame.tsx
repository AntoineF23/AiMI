import { useEffect, useRef, useState } from 'react'
import type { Skin } from '../pet/skin'
import { GameShell } from './GameShell'
import { drawPx, drawPetSprite } from './gameUtils'
import { TREAT_ICONS } from '../game/rewards'
import { sfx } from '../game/sound'

const W = 340
const H = 240
const DURATION = 30

export function CatchGame({ skin, onEnd, onClose }: { skin: Skin; onEnd: (score: number, max: number) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ score: 0, time: DURATION })

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const sheet = skin.anims['idle'].image
    let petX = W / 2
    let score = 0
    let elapsed = 0
    let spawnT = 0
    let raf = 0
    let last = 0
    let done = false
    const treats: { x: number; y: number; v: number; icon: string }[] = []

    const onMove = (e: MouseEvent): void => {
      const rect = canvas.getBoundingClientRect()
      petX = ((e.clientX - rect.left) / rect.width) * W
    }
    canvas.addEventListener('mousemove', onMove)

    const loop = (t: number): void => {
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016
      last = t
      elapsed += dt
      spawnT += dt
      const interval = Math.max(0.45, 0.95 - elapsed * 0.015)
      if (spawnT > interval) {
        spawnT = 0
        treats.push({
          x: 20 + Math.random() * (W - 60),
          y: -24,
          v: 70 + elapsed * 3 + Math.random() * 40,
          icon: TREAT_ICONS[Math.floor(Math.random() * TREAT_ICONS.length)]
        })
      }
      const px = Math.min(W - 48, Math.max(0, petX - 24))
      for (let i = treats.length - 1; i >= 0; i--) {
        const tr = treats[i]
        tr.y += tr.v * dt
        if (tr.y > H - 56 && tr.y < H - 16 && tr.x + 24 > px && tr.x < px + 48) {
          treats.splice(i, 1)
          score++
          sfx.xp()
        } else if (tr.y > H) {
          treats.splice(i, 1)
        }
      }

      ctx.fillStyle = '#241a3d'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#362a5c'
      ctx.fillRect(0, H - 12, W, 12)
      for (const tr of treats) drawPx(ctx, tr.icon, tr.x, tr.y, 24)
      drawPetSprite(ctx, sheet, skin.frameSize, px, H - 60, 48)

      setHud({ score, time: Math.max(0, Math.ceil(DURATION - elapsed)) })
      if (elapsed >= DURATION && !done) {
        done = true
        canvas.removeEventListener('mousemove', onMove)
        onEnd(score, 30)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('mousemove', onMove)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <GameShell title="CATCH THE TREAT" icon="apple" onClose={onClose}>
      <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
      <div className="game-hud">
        <span>SCORE {hud.score}</span>
        <span>TIME {hud.time}</span>
      </div>
    </GameShell>
  )
}
