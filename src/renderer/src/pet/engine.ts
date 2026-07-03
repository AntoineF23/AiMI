import { Animator, type Skin } from './skin'
import { ParticleSystem } from './particles'
import { interactivityLock } from '../interactivity'

/** 32px sprite drawn at 3x → 96px pet on screen. */
export const PET_SCALE = 3

const GRAVITY = 2200
const BOUNCE_RESTITUTION = 0.35
const CLICK_DRAG_THRESHOLD = 6

type State =
  | { kind: 'idle'; until: number }
  | { kind: 'walk'; targetX: number; speed: number }
  | { kind: 'sleep'; until: number }
  | { kind: 'action'; anim: string; until: number }
  | { kind: 'dragged' }
  | { kind: 'falling' }

/**
 * Deterministic local life: the pet is always animated and reactive with zero
 * network involvement. Anything async (AI) just injects actions from outside.
 */
export class PetEngine {
  x = 120
  y = 0
  facing: 1 | -1 = 1
  size: number

  /** Hook for the app layer (radial menu, chat) — fired on a clean click. */
  onPetClicked?: (petCenterX: number, petCenterY: number) => void

  private vx = 0
  private vy = 0
  private state: State = { kind: 'idle', until: 0 }
  private animator: Animator
  private ctx: CanvasRenderingContext2D
  private scale: number
  private hatImg: HTMLImageElement | null = null
  private raf = 0
  private lastT = 0
  private now = 0
  private zzzTimer = 0
  private dragOffsetX = 0
  private dragOffsetY = 0
  private dragPending = false // button down, not yet moved enough to be a drag
  private lastDragX = 0
  private lastDragY = 0

  constructor(
    private petEl: HTMLDivElement,
    spriteCanvas: HTMLCanvasElement,
    private skin: Skin,
    private particles: ParticleSystem,
    scale = PET_SCALE
  ) {
    this.scale = scale
    this.size = skin.frameSize * scale
    this.animator = new Animator(skin)
    spriteCanvas.width = skin.frameSize
    spriteCanvas.height = skin.frameSize
    this.ctx = spriteCanvas.getContext('2d')!
    petEl.style.width = `${this.size}px`
    petEl.style.height = `${this.size}px`

    this.x = Math.random() * Math.max(1, window.innerWidth - this.size)
    this.y = this.groundY()
  }

  /** Evolution: the pet literally grows. */
  setScale(scale: number): void {
    this.scale = scale
    this.size = this.skin.frameSize * scale
    this.petEl.style.width = `${this.size}px`
    this.petEl.style.height = `${this.size}px`
    this.x = Math.min(this.x, Math.max(0, window.innerWidth - this.size))
    if (this.state.kind !== 'dragged' && this.state.kind !== 'falling') this.y = this.groundY()
  }

  setAccessory(name: string | null): void {
    if (!name) {
      this.hatImg = null
      return
    }
    const img = new Image()
    img.src = `./px/${name}.png`
    this.hatImg = img
  }

  setSkin(skin: Skin): void {
    this.skin = skin
    this.animator = new Animator(skin)
    this.setScale(this.scale)
  }

  start(): void {
    this.petEl.addEventListener('pointerdown', this.onPointerDown)
    this.petEl.addEventListener('pointermove', this.onPointerMove)
    this.petEl.addEventListener('pointerup', this.onPointerUp)
    this.petEl.addEventListener('pointercancel', this.onPointerCancel)
    this.petEl.addEventListener('lostpointercapture', this.onPointerCancel)
    window.addEventListener('blur', this.onWindowBlur)
    window.addEventListener('resize', this.onResize)
    this.raf = requestAnimationFrame(this.loop)
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.petEl.removeEventListener('pointerdown', this.onPointerDown)
    this.petEl.removeEventListener('pointermove', this.onPointerMove)
    this.petEl.removeEventListener('pointerup', this.onPointerUp)
    this.petEl.removeEventListener('pointercancel', this.onPointerCancel)
    this.petEl.removeEventListener('lostpointercapture', this.onPointerCancel)
    window.removeEventListener('blur', this.onWindowBlur)
    window.removeEventListener('resize', this.onResize)
  }

  /** Freeze wandering (e.g. while a menu is anchored to the pet). */
  hold(): void {
    if (this.state.kind === 'dragged' || this.state.kind === 'falling') return
    this.y = this.groundY()
    this.state = { kind: 'idle', until: Number.POSITIVE_INFINITY }
  }

  /** Resume normal life after hold(). */
  release(): void {
    if (this.state.kind === 'idle') this.state = { kind: 'idle', until: 0 }
  }

  get centerX(): number {
    return this.x + this.size / 2
  }

  get centerY(): number {
    return this.y + this.size / 2
  }

  /** Play a one-shot animation (eat, happy, wave...) then resume normal life. */
  playAction(anim: string, duration = 0.8): void {
    if (this.state.kind === 'dragged') return
    this.y = this.groundY()
    this.state = { kind: 'action', anim, until: this.now + duration }
    this.animator.play(anim, true)
  }

  celebrate(): void {
    this.playAction('happy', 0.7)
    this.particles.emitHearts(this.centerX, this.y, 4)
    this.particles.emitSparkles(this.centerX, this.centerY, 8)
  }

  // -------------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------------

  private loop = (t: number): void => {
    const dt = this.lastT ? Math.min((t - this.lastT) / 1000, 0.05) : 0.016
    this.lastT = t
    this.now = t / 1000
    this.tick(dt)
    this.animator.update(dt)
    this.animator.draw(this.ctx, this.facing)
    if (this.hatImg?.complete && this.hatImg.naturalWidth > 0) {
      const s = this.skin.frameSize
      this.ctx.save()
      if (this.facing === -1) {
        this.ctx.translate(s, 0)
        this.ctx.scale(-1, 1)
      }
      this.ctx.drawImage(this.hatImg, 0, this.animator.headDy)
      this.ctx.restore()
    }
    this.particles.update(dt)
    this.particles.draw()
    this.petEl.style.transform = `translate3d(${Math.round(this.x)}px, ${Math.round(this.y)}px, 0)`
    this.raf = requestAnimationFrame(this.loop)
  }

  private tick(dt: number): void {
    switch (this.state.kind) {
      case 'idle':
        this.animator.play('idle')
        if (this.now >= this.state.until) this.chooseNextBehavior()
        break

      case 'walk': {
        const { targetX, speed } = this.state
        this.animator.play(speed > 120 ? 'run' : 'walk')
        const dir = targetX > this.x ? 1 : -1
        this.facing = dir
        this.x += dir * speed * dt
        if ((dir === 1 && this.x >= targetX) || (dir === -1 && this.x <= targetX)) {
          this.x = targetX
          this.chooseNextBehavior()
        }
        break
      }

      case 'sleep':
        this.animator.play('sleep')
        this.zzzTimer += dt
        if (this.zzzTimer > 1.4) {
          this.zzzTimer = 0
          this.particles.emitZzz(this.centerX + 14, this.y + 20)
        }
        if (this.now >= this.state.until) this.chooseNextBehavior()
        break

      case 'action':
        if (this.now >= this.state.until || this.animator.done) this.chooseNextBehavior()
        break

      case 'dragged':
        this.animator.play('drag')
        break

      case 'falling': {
        this.animator.play('drag')
        this.vy += GRAVITY * dt
        this.x += this.vx * dt
        this.y += this.vy * dt
        const maxX = window.innerWidth - this.size
        if (this.x < 0) {
          this.x = 0
          this.vx = Math.abs(this.vx) * 0.5
        } else if (this.x > maxX) {
          this.x = maxX
          this.vx = -Math.abs(this.vx) * 0.5
        }
        if (this.y >= this.groundY()) {
          this.y = this.groundY()
          if (Math.abs(this.vy) > 420) {
            this.vy = -Math.abs(this.vy) * BOUNCE_RESTITUTION
            this.vx *= 0.6
          } else {
            this.vx = 0
            this.vy = 0
            this.playAction('land', 0.25)
          }
        }
        break
      }
    }
  }

  private chooseNextBehavior(): void {
    const hour = new Date().getHours()
    const night = hour >= 23 || hour < 7
    const r = Math.random()

    if (night && r < 0.75) {
      this.state = { kind: 'sleep', until: this.now + 120 + Math.random() * 300 }
      return
    }

    if (r < 0.38) {
      this.state = { kind: 'idle', until: this.now + 2 + Math.random() * 5 }
    } else if (r < 0.72) {
      this.state = { kind: 'walk', targetX: this.randomTargetX(), speed: 45 + Math.random() * 30 }
    } else if (r < 0.8) {
      // zoomies!
      this.state = { kind: 'walk', targetX: this.randomTargetX(), speed: 200 + Math.random() * 80 }
    } else if (r < 0.87) {
      this.playAction('think', 3 + Math.random() * 2)
    } else if (r < 0.93) {
      this.playAction('wave', 2.5)
    } else {
      // spontaneous cozy nap — never an obligation, just cat behavior
      this.state = { kind: 'sleep', until: this.now + 15 + Math.random() * 40 }
      this.zzzTimer = 1.2
    }
  }

  private randomTargetX(): number {
    const maxX = window.innerWidth - this.size
    // biased toward actually moving somewhere
    const target = Math.random() * maxX
    if (Math.abs(target - this.x) < 100) {
      return Math.min(maxX, Math.max(0, this.x + (Math.random() < 0.5 ? -1 : 1) * (150 + Math.random() * 300)))
    }
    return target
  }

  private groundY(): number {
    // sprite has ~2px of transparent margin below the feet
    return window.innerHeight - this.size + 2 * this.scale
  }

  // -------------------------------------------------------------------------
  // Pointer interaction
  // -------------------------------------------------------------------------

  private onPointerDown = (e: PointerEvent): void => {
    try {
      this.petEl.setPointerCapture(e.pointerId)
    } catch {
      /* synthetic events have no active pointer */
    }
    interactivityLock.dragging = true
    // NOT a drag yet — the pet only follows the cursor once it actually moves
    // while the button stays held. A plain click never moves it.
    this.dragPending = true
    this.dragOffsetX = e.clientX - this.x
    this.dragOffsetY = e.clientY - this.y
    this.lastDragX = e.clientX
    this.lastDragY = e.clientY
    this.vx = 0
    this.vy = 0
  }

  private onPointerMove = (e: PointerEvent): void => {
    const dragging = this.state.kind === 'dragged'
    if (!this.dragPending && !dragging) return
    // missed pointerup (focus loss, menu opening...): never stay glued to the cursor
    if (e.buttons === 0) {
      this.endDrag(e, false)
      return
    }
    if (!dragging) {
      const movedX = Math.abs(e.clientX - (this.x + this.dragOffsetX))
      const movedY = Math.abs(e.clientY - (this.y + this.dragOffsetY))
      if (movedX <= CLICK_DRAG_THRESHOLD && movedY <= CLICK_DRAG_THRESHOLD) return
      this.state = { kind: 'dragged' }
      this.petEl.classList.add('dragging')
    }
    const dx = e.clientX - this.lastDragX
    const dy = e.clientY - this.lastDragY
    // exponential smoothing of throw velocity
    this.vx = this.vx * 0.7 + (dx / 0.016) * 0.3
    this.vy = this.vy * 0.7 + (dy / 0.016) * 0.3
    this.lastDragX = e.clientX
    this.lastDragY = e.clientY
    this.x = Math.min(window.innerWidth - this.size, Math.max(0, e.clientX - this.dragOffsetX))
    this.y = Math.min(this.groundY(), Math.max(0, e.clientY - this.dragOffsetY))
  }

  private onPointerUp = (e: PointerEvent): void => {
    this.endDrag(e, true)
  }

  private onPointerCancel = (e: PointerEvent): void => {
    this.endDrag(e, false)
  }

  private onWindowBlur = (): void => {
    this.endDrag(null, false)
  }

  private endDrag(e: PointerEvent | null, allowClick: boolean): void {
    const dragging = this.state.kind === 'dragged'
    if (!this.dragPending && !dragging) return
    this.dragPending = false
    interactivityLock.dragging = false
    this.petEl.classList.remove('dragging')
    if (e) {
      try {
        this.petEl.releasePointerCapture(e.pointerId)
      } catch {
        /* not captured */
      }
    }
    if (dragging) {
      this.vx = Math.max(-900, Math.min(900, this.vx))
      this.vy = Math.max(-900, Math.min(900, this.vy))
      this.state = { kind: 'falling' }
    } else if (allowClick) {
      // clean click — celebration + app hook
      this.celebrate()
      this.onPetClicked?.(this.centerX, this.y)
    }
  }

  private onResize = (): void => {
    this.x = Math.min(this.x, window.innerWidth - this.size)
    if (this.state.kind !== 'dragged' && this.state.kind !== 'falling') {
      this.y = this.groundY()
    }
  }
}
