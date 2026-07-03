import { useEffect, useRef, useState } from 'react'
import type { Skin } from '../pet/skin'
import { GameShell } from './GameShell'
import { drawPetSprite } from './gameUtils'
import { sfx } from '../game/sound'

const W = 420
const H = 320
const WIN_AT = 5

export function PongGame({ skin, onEnd, onClose }: { skin: Skin; onEnd: (score: number, max: number) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ you: 0, pet: 0 })

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const sheet = skin.anims['idle'].image
    let playerX = W / 2
    let petPaddleX = W / 2
    let you = 0
    let pet = 0
    let raf = 0
    let last = 0
    let done = false
    const ball = { x: W / 2, y: H / 2, vx: 120, vy: 160 }

    const resetBall = (towardPlayer: boolean): void => {
      ball.x = W / 2
      ball.y = H / 2
      const speed = 160 + (you + pet) * 18
      ball.vx = (Math.random() - 0.5) * speed
      ball.vy = towardPlayer ? speed : -speed
    }

    const onMove = (e: MouseEvent): void => {
      const rect = canvas.getBoundingClientRect()
      playerX = ((e.clientX - rect.left) / rect.width) * W
    }
    canvas.addEventListener('mousemove', onMove)

    const PADDLE_W = 68
    const loop = (t: number): void => {
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016
      last = t

      // pet AI: follows with lag + personality wobble
      const target = ball.x + Math.sin(t / 300) * 18
      const maxSpeed = 130 + (you + pet) * 10
      petPaddleX += Math.max(-maxSpeed * dt, Math.min(maxSpeed * dt, target - petPaddleX))

      ball.x += ball.vx * dt
      ball.y += ball.vy * dt
      if (ball.x < 6 || ball.x > W - 6) ball.vx *= -1
      const px = Math.min(W - PADDLE_W, Math.max(0, playerX - PADDLE_W / 2))
      const ex = Math.min(W - PADDLE_W, Math.max(0, petPaddleX - PADDLE_W / 2))
      // player paddle (bottom)
      if (ball.vy > 0 && ball.y > H - 26 && ball.y < H - 12 && ball.x > px - 6 && ball.x < px + PADDLE_W + 6) {
        ball.vy = -Math.abs(ball.vy) * 1.05
        ball.vx += ((ball.x - (px + PADDLE_W / 2)) / (PADDLE_W / 2)) * 90
        sfx.pop()
      }
      // pet paddle (top)
      if (ball.vy < 0 && ball.y < 26 && ball.y > 12 && ball.x > ex - 6 && ball.x < ex + PADDLE_W + 6) {
        ball.vy = Math.abs(ball.vy) * 1.05
        ball.vx += ((ball.x - (ex + PADDLE_W / 2)) / (PADDLE_W / 2)) * 90
        sfx.pop()
      }
      if (ball.y < -10) {
        you++
        sfx.xp()
        resetBall(false)
      } else if (ball.y > H + 10) {
        pet++
        resetBall(true)
      }

      ctx.fillStyle = '#241a3d'
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = '#4a3a78'
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.moveTo(0, H / 2)
      ctx.lineTo(W, H / 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#a78bfa'
      ctx.fillRect(px, H - 20, PADDLE_W, 8)
      ctx.fillStyle = '#ff9ecf'
      ctx.fillRect(ex, 12, PADDLE_W, 8)
      drawPetSprite(ctx, sheet, skin.frameSize, ex + PADDLE_W / 2 - 20, -8, 40)
      ctx.fillStyle = '#ffd75e'
      ctx.fillRect(ball.x - 5, ball.y - 5, 10, 10)

      setHud({ you, pet })
      if ((you >= WIN_AT || pet >= WIN_AT) && !done) {
        done = true
        canvas.removeEventListener('mousemove', onMove)
        onEnd(you, WIN_AT)
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
    <GameShell title="PONG VS PET" icon="gamepad" onClose={onClose}>
      <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
      <div className="game-hud">
        <span>YOU {hud.you}</span>
        <span>PET {hud.pet}</span>
      </div>
    </GameShell>
  )
}
