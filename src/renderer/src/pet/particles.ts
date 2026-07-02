interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  kind: 'heart' | 'zzz' | 'sparkle' | 'confetti'
  size: number
  color?: string
  rot?: number
  vr?: number
}

const CONFETTI_COLORS = ['#ff5c8a', '#ffd75e', '#4ade80', '#60a5fa', '#c084fc', '#ff9ecf', '#a78bfa']

const HEART: string[] = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..']

/** Lightweight canvas particle layer covering the whole window. */
export class ParticleSystem {
  private particles: Particle[] = []
  private ctx: CanvasRenderingContext2D
  private dpr = window.devicePixelRatio || 1

  private zzzImg: HTMLImageElement

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.zzzImg = new Image()
    this.zzzImg.src = './px/zzz.png'
    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  private resize(): void {
    this.canvas.width = window.innerWidth * this.dpr
    this.canvas.height = window.innerHeight * this.dpr
  }

  get count(): number {
    return this.particles.length
  }

  emitHearts(x: number, y: number, n = 3): void {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 30,
        vy: -50 - Math.random() * 40,
        life: 0,
        maxLife: 1 + Math.random() * 0.5,
        kind: 'heart',
        size: 3 + Math.floor(Math.random() * 2)
      })
    }
  }

  emitZzz(x: number, y: number): void {
    this.particles.push({
      x,
      y,
      vx: 8 + Math.random() * 8,
      vy: -18 - Math.random() * 8,
      life: 0,
      maxLife: 2.5,
      kind: 'zzz',
      size: 12 + Math.random() * 6
    })
  }

  emitSparkles(x: number, y: number, n = 6): void {
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 40 + Math.random() * 80
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        kind: 'sparkle',
        size: 2 + Math.random() * 2
      })
    }
  }

  emitConfetti(x: number, y: number, n = 70): void {
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
      const speed = 250 + Math.random() * 450
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 1.6 + Math.random() * 1.2,
        kind: 'confetti',
        size: 4 + Math.random() * 5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12
      })
    }
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.kind === 'zzz') p.x += Math.sin(p.life * 4) * 0.6
      if (p.kind === 'confetti') {
        p.vy += 900 * dt
        p.vx *= 1 - 1.5 * dt
        p.rot! += p.vr! * dt
        p.x += Math.sin(p.life * 6 + p.size) * 0.8
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife)
  }

  draw(): void {
    const { ctx, dpr } = this
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife
      ctx.globalAlpha = Math.max(0, alpha)
      if (p.kind === 'heart') {
        ctx.fillStyle = '#ff5c8a'
        const px = p.size
        for (let ry = 0; ry < HEART.length; ry++) {
          for (let rx = 0; rx < HEART[ry].length; rx++) {
            if (HEART[ry][rx] === 'X') {
              ctx.fillRect(p.x + rx * px, p.y + ry * px, px, px)
            }
          }
        }
      } else if (p.kind === 'zzz') {
        const s = p.size / 8
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(this.zzzImg, p.x, p.y, 16 * s, 16 * s)
      } else if (p.kind === 'confetti') {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot!)
        ctx.fillStyle = p.color!
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      } else {
        ctx.fillStyle = '#ffd75e'
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      }
    }
    ctx.globalAlpha = 1
  }
}
