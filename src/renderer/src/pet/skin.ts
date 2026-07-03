export interface SkinAnimation {
  image: HTMLImageElement
  frames: number
  fps: number
  loop: boolean
  /** per-frame vertical offset of the head (for hat overlays) */
  headDy: number[]
}

export interface Skin {
  name: string
  frameSize: number
  palette: Record<string, string>
  anims: Record<string, SkinAnimation>
}

interface SkinManifest {
  name: string
  frameSize: number
  palette: Record<string, string>
  animations: Record<string, { file: string; frames: number; fps: number; loop: boolean; headDy?: number[] }>
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function loadSkin(baseUrl = './skins/default'): Promise<Skin> {
  const manifest: SkinManifest = await fetch(`${baseUrl}/skin.json`).then((r) => r.json())
  const anims: Record<string, SkinAnimation> = {}
  await Promise.all(
    Object.entries(manifest.animations).map(async ([name, def]) => {
      anims[name] = {
        image: await loadImage(`${baseUrl}/${def.file}`),
        frames: def.frames,
        fps: def.fps,
        loop: def.loop,
        headDy: def.headDy ?? new Array(def.frames).fill(0)
      }
    })
  )
  return { name: manifest.name, frameSize: manifest.frameSize, palette: manifest.palette, anims }
}

/** Steps through the frames of one animation; drives the sprite canvas. */
export class Animator {
  private current = 'idle'
  private frame = 0
  private elapsed = 0
  /** true when a non-looping animation has shown its last frame */
  done = false

  constructor(private skin: Skin) {}

  get name(): string {
    return this.current
  }

  /** head offset of the frame being shown (hat tracking) */
  get headDy(): number {
    return this.skin.anims[this.current]?.headDy[this.frame] ?? 0
  }

  play(name: string, restart = false): void {
    if (!this.skin.anims[name]) return
    if (this.current === name && !restart) return
    this.current = name
    this.frame = 0
    this.elapsed = 0
    this.done = false
  }

  update(dt: number): void {
    const anim = this.skin.anims[this.current]
    if (!anim || this.done) return
    this.elapsed += dt
    const frameDuration = 1 / anim.fps
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration
      if (this.frame < anim.frames - 1) {
        this.frame++
      } else if (anim.loop) {
        this.frame = 0
      } else {
        this.done = true
        break
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, facing: 1 | -1): void {
    const anim = this.skin.anims[this.current]
    if (!anim) return
    const s = this.skin.frameSize
    ctx.clearRect(0, 0, s, s)
    ctx.save()
    if (facing === -1) {
      ctx.translate(s, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(anim.image, this.frame * s, 0, s, s, 0, 0, s, s)
    ctx.restore()
  }
}
