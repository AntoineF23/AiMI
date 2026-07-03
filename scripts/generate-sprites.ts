/**
 * Generates the default AiMI skin: pixel-art sprite sheets for every animation,
 * a skin.json manifest, and the macOS tray icon.
 *
 * The pet is a small, dignified unicorn drawn in side profile (facing right —
 * the engine mirrors it when walking left). Drawn procedurally (shapes +
 * per-frame params) so animations stay consistent and palettes can be swapped
 * to create skin variants.
 *
 * Output: src/renderer/public/skins/<skin>/*  and  resources/tray*.png
 * `--preview <dir>` writes a 6x contact sheet for visual inspection.
 */
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 32

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

const PALETTE = {
  outline: '#241a3d',
  coat: '#f2f2f7',
  shade: '#c9cddd',
  mane: '#4f8fd9',
  maneShade: '#3a6fb0',
  hoof: '#3a3a4a',
  eye: '#241a3d',
  muzzle: '#9a9ab0',
  earInner: '#c9cddd',
  horn1: '#c05a5a', // base → tip
  horn2: '#cf9a4f',
  horn3: '#5a9a6f',
  horn4: '#7a6fd0'
} as const

type ColorKey = keyof typeof PALETTE
type Palette = Record<ColorKey, string>

/** Bundled palette-swap skins — same unicorn, new coat and mane. */
const SKINS: Record<string, { title: string; palette: Palette }> = {
  default: { title: 'AiMI Classic', palette: { ...PALETTE } },
  mint: {
    title: 'Frost',
    palette: {
      ...PALETTE,
      coat: '#eef5f7',
      shade: '#c4d8de',
      mane: '#5fc4d9',
      maneShade: '#3f9db3',
      horn1: '#5f8fd0',
      horn2: '#5fb0c9',
      horn3: '#7a6fd0',
      horn4: '#9a8fe0'
    }
  },
  peach: {
    title: 'Ember',
    palette: {
      ...PALETTE,
      coat: '#f6efe3',
      shade: '#dfd0b8',
      mane: '#d97742',
      maneShade: '#b0562a',
      horn1: '#c05a5a',
      horn2: '#d9903f',
      horn3: '#d9c94f',
      horn4: '#cf9a4f'
    }
  }
}

// ---------------------------------------------------------------------------
// Tiny raster grid storing palette keys (makes the outline pass trivial)
// ---------------------------------------------------------------------------

class Grid {
  cells: (ColorKey | null)[]
  constructor(
    public w: number,
    public h: number
  ) {
    this.cells = new Array(w * h).fill(null)
  }

  set(x: number, y: number, c: ColorKey) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.cells[Math.round(y) * this.w + Math.round(x)] = c
  }

  get(x: number, y: number): ColorKey | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null
    return this.cells[y * this.w + x]
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, c: ColorKey) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx
        const dy = (y - cy) / ry
        if (dx * dx + dy * dy <= 1) this.set(x, y, c)
      }
    }
  }

  fillRect(x0: number, y0: number, w: number, h: number, c: ColorKey) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c)
  }

  /** 1px outer outline around everything drawn so far. */
  outline() {
    const toOutline: [number, number][] = []
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== null) continue
        if (
          (this.get(x - 1, y) && this.get(x - 1, y) !== 'outline') ||
          (this.get(x + 1, y) && this.get(x + 1, y) !== 'outline') ||
          (this.get(x, y - 1) && this.get(x, y - 1) !== 'outline') ||
          (this.get(x, y + 1) && this.get(x, y + 1) !== 'outline')
        ) {
          toOutline.push([x, y])
        }
      }
    }
    for (const [x, y] of toOutline) this.set(x, y, 'outline')
  }
}

// ---------------------------------------------------------------------------
// The unicorn, parameterized per frame
// ---------------------------------------------------------------------------

interface Leg {
  dx?: number
  lift?: number
}

interface UPose {
  dy?: number // whole-body vertical offset
  legs?: [Leg, Leg, Leg, Leg] // backFar, backNear, frontFar, frontNear
  tail?: 0 | 1 | 2 | 3
  eye?: 'open' | 'blink' | 'closed' | 'wide' | 'up'
  headDy?: number // head+neck offset (positive = lowered, grazing)
  headDx?: number
  earFlick?: boolean
  lying?: boolean
  maneFlow?: boolean // streaming back when galloping
}

const LEGS_STAND: [Leg, Leg, Leg, Leg] = [{}, {}, {}, {}]

/** Draws one frame; returns the hat anchor offset {dx, dy} vs the base pose. */
function drawUnicorn(g: Grid, p: UPose): { dx: number; dy: number } {
  const dy = p.dy ?? 0
  const headDx = p.headDx ?? 0
  const headDy = p.headDy ?? 0
  const eye = p.eye ?? 'open'

  if (p.lying) {
    drawLying(g, p)
    // hat anchor: hats are authored centered on x~15.5 with a brim at y~10;
    // the unicorn skull sits at (21,14+dy) when lying
    return { dx: 8, dy: 2 + dy }
  }

  // tail (behind body) — four sway/stream variants
  const tailFrames: [number, number][][] = [
    [
      [6, 14],
      [5, 16],
      [4, 18],
      [4, 20],
      [5, 22],
      [6, 24]
    ],
    [
      [6, 14],
      [4, 16],
      [3, 18],
      [3, 20],
      [4, 22],
      [5, 24]
    ],
    [
      [6, 14],
      [5, 16],
      [5, 18],
      [4, 20],
      [4, 22],
      [6, 23]
    ],
    // streaming back (gallop)
    [
      [5, 14],
      [3, 14],
      [1, 15],
      [2, 17],
      [4, 18],
      [3, 20]
    ]
  ]
  tailFrames[p.tail ?? 0].forEach(([tx, ty], i) => {
    g.fillRect(tx, ty + dy, 2, 2, i % 2 === 0 ? 'mane' : 'maneShade')
  })

  // legs: [backFar, backNear, frontFar, frontNear] — far pair shaded for depth
  const legs = p.legs ?? LEGS_STAND
  const baseX = [9, 12, 19, 22]
  const far = [true, false, true, false]
  legs.forEach((leg, i) => {
    const lx = baseX[i] + (leg.dx ?? 0)
    const lift = leg.lift ?? 0
    const topY = 20 + dy
    const footY = 26 + dy - lift
    if (footY > topY) g.fillRect(lx, topY, 2, footY - topY + 1, far[i] ? 'shade' : 'coat')
    g.fillRect(lx, footY + 1, 2, 2, 'hoof')
  })

  // body
  g.fillEllipse(15.5, 17.5 + dy, 8.5, 5, 'coat')
  // belly shading
  g.fillRect(10, 21 + dy, 10, 1, 'shade')

  // neck: blocks lerped from shoulder to head base
  const sx = 19
  const sy = 11 + dy
  const hx = 22 + headDx
  const hy = 7 + headDy + dy
  for (let i = 0; i <= 5; i++) {
    const t = i / 5
    g.fillRect(Math.round(sx + (hx - sx) * t), Math.round(sy + (hy - sy) * t), 3, 4, 'coat')
  }

  // head (origin = hx, hy): skull + snout to the right
  g.fillRect(hx, hy, 5, 5, 'coat')
  g.fillRect(hx + 4, hy + 2, 3, 3, 'coat')
  g.set(hx + 6, hy + 3, 'muzzle') // nostril

  // ear
  const earY = hy - 2 - (p.earFlick ? 1 : 0)
  g.fillRect(hx - 1, earY, 2, 2, 'coat')
  g.set(hx - 1, earY + 1, 'earInner')

  // horn: slanted muted-rainbow bands, base → tip
  g.fillRect(hx + 1, hy - 2, 2, 1, 'horn1')
  g.fillRect(hx + 1, hy - 3, 2, 1, 'horn2')
  g.fillRect(hx + 2, hy - 4, 2, 1, 'horn3')
  g.fillRect(hx + 2, hy - 5, 2, 1, 'horn4')

  // mane: forelock + crest along the neck, with flow variant
  g.fillRect(hx, hy - 1, 2, 1, 'mane')
  const flow = p.maneFlow ? -1 : 0
  for (let i = 0; i <= 5; i++) {
    const t = i / 5
    const mx = Math.round(sx + (hx - sx) * t) - 1 + flow * Math.round(t * 2)
    const my = Math.round(sy + (hy - sy) * t) - 1
    g.fillRect(mx, my, 2, 2, i % 2 === 0 ? 'mane' : 'maneShade')
  }
  g.fillRect(16, 12 + dy, 2, 2, 'maneShade') // shoulder tuft

  // eye — small and composed, nothing kawaii
  const ex = hx + 3
  const eyY = hy + 1
  if (eye === 'open') {
    g.fillRect(ex, eyY, 1, 2, 'eye')
  } else if (eye === 'up') {
    g.fillRect(ex, eyY - 1, 1, 2, 'eye')
  } else if (eye === 'blink' || eye === 'closed') {
    g.set(ex, eyY + 1, 'eye')
  } else if (eye === 'wide') {
    g.fillRect(ex - 1, eyY, 2, 2, 'eye')
  }

  g.outline()
  // hat anchor: shift the cat-era hat art (+9,-5) onto the unicorn skull
  return { dx: hx - 13, dy: hy - 12 }
}

/** Sleeping pose: legs folded, head resting low, tail curled. */
function drawLying(g: Grid, p: UPose): void {
  const dy = p.dy ?? 0
  // tail curled at the back
  ;[
    [5, 20],
    [4, 22],
    [5, 24],
    [7, 25]
  ].forEach(([tx, ty], i) => g.fillRect(tx, ty, 2, 2, i % 2 === 0 ? 'mane' : 'maneShade'))

  // body low and long
  g.fillEllipse(15, 21 + dy, 9, 4.5, 'coat')
  // folded-leg hoof nubs
  g.fillRect(11, 24, 2, 2, 'hoof')
  g.fillRect(18, 24, 2, 2, 'hoof')

  // short neck + resting head
  const hx = 21
  const hy = 14 + dy
  g.fillRect(19, 17 + dy, 4, 4, 'coat')
  g.fillRect(hx, hy, 5, 5, 'coat')
  g.fillRect(hx + 4, hy + 2, 3, 3, 'coat')
  g.set(hx + 6, hy + 3, 'muzzle')

  // ear, horn, forelock
  g.fillRect(hx - 1, hy - 2, 2, 2, 'coat')
  g.set(hx - 1, hy - 1, 'earInner')
  g.fillRect(hx + 1, hy - 2, 2, 1, 'horn1')
  g.fillRect(hx + 1, hy - 3, 2, 1, 'horn2')
  g.fillRect(hx + 2, hy - 4, 2, 1, 'horn3')
  g.fillRect(hx + 2, hy - 5, 2, 1, 'horn4')
  g.fillRect(hx, hy - 1, 2, 1, 'mane')
  g.fillRect(18, 16 + dy, 2, 2, 'maneShade')

  // closed eye
  g.set(hx + 3, hy + 2, 'eye')

  g.outline()
}

// ---------------------------------------------------------------------------
// Animation definitions
// ---------------------------------------------------------------------------

interface AnimDef {
  fps: number
  loop: boolean
  frames: UPose[]
}

const walkLegs = (a: Leg, b: Leg, c: Leg, d: Leg): [Leg, Leg, Leg, Leg] => [a, b, c, d]

const ANIMATIONS: Record<string, AnimDef> = {
  idle: {
    fps: 4,
    loop: true,
    frames: [
      { tail: 0 },
      { tail: 1 },
      { tail: 1, dy: 1, earFlick: true },
      { tail: 2, dy: 1 },
      { tail: 1, eye: 'blink' },
      { tail: 0 }
    ]
  },
  walk: {
    fps: 8,
    loop: true,
    frames: [
      { legs: LEGS_STAND, tail: 1 },
      { legs: walkLegs({}, { dx: 1, lift: 2 }, { dx: 1, lift: 2 }, {}), dy: -1, tail: 1 },
      { legs: walkLegs({}, { dx: 2 }, { dx: 2 }, {}), tail: 2 },
      { legs: LEGS_STAND, tail: 2 },
      { legs: walkLegs({ dx: 1, lift: 2 }, {}, {}, { dx: 1, lift: 2 }), dy: -1, tail: 1 },
      { legs: walkLegs({ dx: 2 }, {}, {}, { dx: 2 }), tail: 0 }
    ]
  },
  run: {
    fps: 12,
    loop: true,
    frames: [
      { legs: walkLegs({ dx: 3 }, { dx: 2 }, { dx: -2 }, { dx: -1 }), dy: -1, tail: 3, maneFlow: true },
      { legs: walkLegs({ dx: -2, lift: 1 }, { dx: -3, lift: 1 }, { dx: 2, lift: 1 }, { dx: 3, lift: 1 }), dy: -3, tail: 3, maneFlow: true },
      { legs: walkLegs({ dx: 1, lift: 2 }, { dx: 0, lift: 2 }, { dx: 0, lift: 2 }, { dx: 1, lift: 2 }), dy: -4, tail: 3, maneFlow: true },
      { legs: walkLegs({ dx: -1, lift: 1 }, { dx: 0 }, { dx: 1 }, { dx: 0 }), tail: 3, maneFlow: true }
    ]
  },
  sleep: {
    fps: 2,
    loop: true,
    frames: [
      { lying: true },
      { lying: true, dy: 1 },
      { lying: true, dy: 1 },
      { lying: true }
    ]
  },
  happy: {
    fps: 10,
    loop: false,
    frames: [
      { dy: 1, tail: 1 },
      { legs: walkLegs({}, {}, { dx: 2, lift: 4 }, { dx: 2, lift: 4 }), dy: -1, headDy: -2, tail: 2 },
      { legs: walkLegs({}, {}, { dx: 3, lift: 6 }, { dx: 3, lift: 6 }), dy: -2, headDy: -3, tail: 3, maneFlow: true },
      { legs: walkLegs({}, {}, { dx: 3, lift: 6 }, { dx: 3, lift: 6 }), dy: -2, headDy: -3, tail: 3, maneFlow: true, eye: 'blink' },
      { legs: walkLegs({}, {}, { dx: 2, lift: 3 }, { dx: 2, lift: 3 }), dy: -1, headDy: -1, tail: 1 },
      { tail: 1 }
    ]
  },
  eat: {
    fps: 6,
    loop: false,
    frames: [
      { headDy: 6, headDx: 2, tail: 1 },
      { headDy: 12, headDx: 3, eye: 'blink', tail: 1 },
      { headDy: 12, headDx: 4, eye: 'blink', tail: 2 },
      { headDy: 12, headDx: 3, eye: 'blink', tail: 2 },
      { headDy: 12, headDx: 4, eye: 'blink', tail: 1 },
      { headDy: 6, headDx: 2, tail: 0 }
    ]
  },
  think: {
    fps: 4,
    loop: true,
    frames: [
      { eye: 'up', headDy: -1, tail: 0 },
      { eye: 'up', headDy: -1, tail: 1 },
      { eye: 'up', headDy: -1, tail: 2, earFlick: true },
      { eye: 'up', headDy: -1, tail: 1 }
    ]
  },
  wave: {
    fps: 8,
    loop: true,
    frames: [
      { legs: walkLegs({}, {}, {}, { dx: 2, lift: 5 }), headDy: -1, tail: 1 },
      { legs: walkLegs({}, {}, {}, { dx: 4, lift: 4 }), headDy: -1, tail: 2 },
      { legs: walkLegs({}, {}, {}, { dx: 2, lift: 5 }), headDy: -1, tail: 1 },
      { legs: walkLegs({}, {}, {}, { dx: 4, lift: 4 }), headDy: -1, tail: 2 }
    ]
  },
  drag: {
    fps: 4,
    loop: true,
    frames: [
      { legs: walkLegs({ dx: -1, lift: 1 }, { dx: -1 }, { dx: 1, lift: 1 }, { dx: 1 }), eye: 'wide', tail: 2 },
      { legs: walkLegs({ dx: -1 }, { dx: -1, lift: 1 }, { dx: 1 }, { dx: 1, lift: 1 }), eye: 'wide', tail: 1, dy: 1 }
    ]
  },
  land: {
    fps: 12,
    loop: false,
    frames: [
      { legs: walkLegs({ dx: -2 }, { dx: -2 }, { dx: 2 }, { dx: 2 }), dy: 1, eye: 'wide' },
      { legs: LEGS_STAND, tail: 1 }
    ]
  }
}

// ---------------------------------------------------------------------------
// PNG helpers
// ---------------------------------------------------------------------------

function hexToRgba(hex: string): [number, number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255]
}

function gridToPng(grids: Grid[], scale = 1, palette: Palette = PALETTE): PNG {
  const w = grids.reduce((s, g) => s + g.w, 0) * scale
  const h = Math.max(...grids.map((g) => g.h)) * scale
  const png = new PNG({ width: w, height: h })
  let xOff = 0
  for (const g of grids) {
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const key = g.get(x, y)
        if (!key) continue
        const [r, gg, b, a] = hexToRgba(palette[key])
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const idx = (((y * scale + sy) * w + xOff + x * scale + sx) << 2)
            png.data[idx] = r
            png.data[idx + 1] = gg
            png.data[idx + 2] = b
            png.data[idx + 3] = a
          }
        }
      }
    }
    xOff += g.w * scale
  }
  return png
}

// ---------------------------------------------------------------------------
// Tray icon: unicorn head silhouette (macOS template image: black + alpha)
// ---------------------------------------------------------------------------

function drawTrayIcon(size: 16 | 32): PNG {
  const s = size / 16
  const png = new PNG({ width: size, height: size })
  const put = (x: number, y: number) => {
    for (let sy = 0; sy < s; sy++)
      for (let sx = 0; sx < s; sx++) {
        const idx = ((y * s + sy) * size + x * s + sx) << 2
        png.data[idx] = 0
        png.data[idx + 1] = 0
        png.data[idx + 2] = 0
        png.data[idx + 3] = 255
      }
  }
  const rows = [
    '..........XX....',
    '.........XX.....',
    '....X...XX......',
    '....XX.XXXX.....',
    '....XXXXXXXXX...',
    '...XXXXXXXXXXXX.',
    '...XXXXXXXXXXXX.',
    '..XXXXXXXX..X...',
    '.XXXXXXXXX......',
    '.XXXXXXXXX......',
    'XXXXXXXXX.......',
    'XXXXXXXX........',
    'XXX..XXX........',
    'XXX..XXX........',
    'XXX..XXX........',
    '................'
  ]
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) if (row[x] === 'X') put(x, y)
  })
  return png
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const resourcesDir = join(ROOT, 'resources')
mkdirSync(resourcesDir, { recursive: true })

// render all frames once (palette applied at write time)
const allGrids: Record<string, Grid[]> = {}
const allHeadDy: Record<string, number[]> = {}
const allHeadDx: Record<string, number[]> = {}
for (const [name, def] of Object.entries(ANIMATIONS)) {
  const grids: Grid[] = []
  const headDy: number[] = []
  const headDx: number[] = []
  for (const params of def.frames) {
    const g = new Grid(SIZE, SIZE)
    const anchor = drawUnicorn(g, params)
    headDy.push(anchor.dy)
    headDx.push(anchor.dx)
    grids.push(g)
  }
  allGrids[name] = grids
  allHeadDy[name] = headDy
  allHeadDx[name] = headDx
}

for (const [skinName, skin] of Object.entries(SKINS)) {
  const skinDir = join(ROOT, 'src/renderer/public/skins', skinName)
  mkdirSync(skinDir, { recursive: true })
  const manifest: {
    name: string
    version: number
    frameSize: number
    palette: Record<string, string>
    animations: Record<
      string,
      { file: string; frames: number; fps: number; loop: boolean; headDy: number[]; headDx: number[] }
    >
  } = {
    name: skin.title,
    version: 2,
    frameSize: SIZE,
    palette: { ...skin.palette },
    animations: {}
  }
  for (const [name, def] of Object.entries(ANIMATIONS)) {
    writeFileSync(join(skinDir, `${name}.png`), PNG.sync.write(gridToPng(allGrids[name], 1, skin.palette)))
    manifest.animations[name] = {
      file: `${name}.png`,
      frames: def.frames.length,
      fps: def.fps,
      loop: def.loop,
      headDy: allHeadDy[name],
      headDx: allHeadDx[name]
    }
  }
  writeFileSync(join(skinDir, 'skin.json'), JSON.stringify(manifest, null, 2))
}

writeFileSync(join(resourcesDir, 'trayTemplate.png'), PNG.sync.write(drawTrayIcon(16)))
writeFileSync(join(resourcesDir, 'trayTemplate@2x.png'), PNG.sync.write(drawTrayIcon(32)))

// Optional preview contact sheet (6x scale, one row per animation)
const previewFlag = process.argv.indexOf('--preview')
if (previewFlag !== -1) {
  const outDir = process.argv[previewFlag + 1] ?? ROOT
  const scale = 6
  const rows = Object.entries(allGrids)
  const maxFrames = Math.max(...rows.map(([, g]) => g.length))
  const sheet = new PNG({
    width: maxFrames * SIZE * scale,
    height: rows.length * SIZE * scale,
    bgColor: { red: 255, green: 255, blue: 255 }
  })
  rows.forEach(([, grids], row) => {
    const strip = gridToPng(grids, scale)
    PNG.bitblt(strip, sheet, 0, 0, strip.width, strip.height, 0, row * SIZE * scale)
  })
  writeFileSync(join(outDir, 'preview.png'), PNG.sync.write(sheet))
  console.log(`preview written to ${join(outDir, 'preview.png')}`)
}

console.log(`✔ skins written: ${Object.keys(SKINS).join(', ')} (${Object.keys(ANIMATIONS).length} animations each)`)
console.log(`✔ tray icons written to ${resourcesDir}`)
