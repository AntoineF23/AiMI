/**
 * Generates every AiMI unicorn spritesheet: 8 coat colors x 4 growth stages
 * x 10 animations, each with a skin.json manifest, plus the macOS tray icon.
 *
 * The coat color is rolled once when the egg hatches (rarity-weighted) and
 * never changes; the unicorn grows through stages with its level:
 *   s1 FOAL       — stubby legs, big head, horn nub, wisp of mane
 *   s2 YEARLING   — youth proportions, short horn
 *   s3 UNICORN    — full horn and mane
 *   s4 LEGENDARY  — five-band horn with a lit tip, flowing mane, gold hooves
 *
 * Side profile facing right (the engine mirrors when walking left). Serious
 * pixel art: no blush, small composed eye.
 *
 * Output: src/renderer/public/skins/<color>-s<stage>/*  and  resources/tray*.png
 * `--preview <dir>` writes contact sheets (all anims at s3 + one row per stage).
 */
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 32

// ---------------------------------------------------------------------------
// Palettes — one per coat color
// ---------------------------------------------------------------------------

const PALETTE = {
  outline: '#241a3d',
  coat: '#f2f2f7',
  shade: '#c9cddd',
  mane: '#4f8fd9',
  maneShade: '#3a6fb0',
  hoof: '#3a3a4a',
  hoofGold: '#d9a83f',
  eye: '#241a3d',
  muzzle: '#9a9ab0',
  earInner: '#c9cddd',
  horn1: '#c05a5a', // base → tip
  horn2: '#cf9a4f',
  horn3: '#5a9a6f',
  horn4: '#7a6fd0',
  hornTip: '#efe9ff'
} as const

type ColorKey = keyof typeof PALETTE
type Palette = Record<ColorKey, string>

const COLOR_SKINS: Record<string, { title: string; palette: Palette }> = {
  snow: { title: 'Snow', palette: { ...PALETTE } },
  rose: {
    title: 'Rose',
    palette: { ...PALETTE, coat: '#f5e9ee', shade: '#dcc3cf', mane: '#cf6f96', maneShade: '#a84f75' }
  },
  storm: {
    title: 'Storm',
    palette: { ...PALETTE, coat: '#d9dde8', shade: '#b3bacd', mane: '#5f7d9c', maneShade: '#46617f' }
  },
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
  ember: {
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
  },
  lilac: {
    title: 'Lilac',
    palette: { ...PALETTE, coat: '#eee9f8', shade: '#d2c8e8', mane: '#8f6fd0', maneShade: '#6f4fb0' }
  },
  gold: {
    title: 'Golden',
    palette: {
      ...PALETTE,
      coat: '#f7f0dc',
      shade: '#e2d4ae',
      mane: '#d9a83f',
      maneShade: '#b0832a',
      horn1: '#b0832a',
      horn2: '#cf9a4f',
      horn3: '#d9a83f',
      horn4: '#e8c96f',
      hornTip: '#fff3c4'
    }
  },
  midnight: {
    title: 'Midnight',
    palette: {
      ...PALETTE,
      outline: '#15102a',
      coat: '#454063',
      shade: '#332f4c',
      mane: '#b8c4e8',
      maneShade: '#8f9fc9',
      eye: '#efeaff',
      muzzle: '#8f8fb0',
      earInner: '#332f4c',
      horn1: '#8f9fc9',
      horn2: '#a8b4dd',
      horn3: '#b8c4e8',
      horn4: '#d8dff5',
      hornTip: '#ffffff'
    }
  }
}

// ---------------------------------------------------------------------------
// Growth stages
// ---------------------------------------------------------------------------

interface StageCfg {
  bodyCx: number
  bodyCy: number
  bodyRx: number
  bodyRy: number
  legBaseX: [number, number, number, number]
  legTopY: number
  footY: number
  shoulder: [number, number]
  headBase: [number, number]
  hornBands: number
  hornLit: boolean
  maneBlocks: number
  tailSegs: number
  hoofKey: ColorKey
}

const STAGES: Record<number, StageCfg> = {
  1: {
    bodyCx: 15.5,
    bodyCy: 20,
    bodyRx: 6,
    bodyRy: 3.5,
    legBaseX: [11, 13, 18, 20],
    legTopY: 22,
    footY: 26,
    shoulder: [17, 15],
    headBase: [19, 11],
    hornBands: 1,
    hornLit: false,
    maneBlocks: 2,
    tailSegs: 3,
    hoofKey: 'hoof'
  },
  2: {
    bodyCx: 15.5,
    bodyCy: 18,
    bodyRx: 7.5,
    bodyRy: 4.5,
    legBaseX: [10, 12.5, 19, 21.5],
    legTopY: 20,
    footY: 26,
    shoulder: [18, 12],
    headBase: [21, 8],
    hornBands: 2,
    hornLit: false,
    maneBlocks: 4,
    tailSegs: 4,
    hoofKey: 'hoof'
  },
  3: {
    bodyCx: 15.5,
    bodyCy: 17.5,
    bodyRx: 8.5,
    bodyRy: 5,
    legBaseX: [9, 12, 19, 22],
    legTopY: 20,
    footY: 26,
    shoulder: [19, 11],
    headBase: [22, 7],
    hornBands: 4,
    hornLit: false,
    maneBlocks: 6,
    tailSegs: 6,
    hoofKey: 'hoof'
  },
  4: {
    bodyCx: 15.5,
    bodyCy: 17.5,
    bodyRx: 8.5,
    bodyRy: 5,
    legBaseX: [9, 12, 19, 22],
    legTopY: 20,
    footY: 26,
    shoulder: [19, 11],
    headBase: [22, 6],
    hornBands: 5,
    hornLit: true,
    maneBlocks: 8,
    tailSegs: 6,
    hoofKey: 'hoofGold'
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
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(Math.round(x), Math.round(y), c)
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
// The unicorn, parameterized per frame and growth stage
// ---------------------------------------------------------------------------

interface Leg {
  dx?: number
  lift?: number
}

interface UPose {
  dy?: number
  legs?: [Leg, Leg, Leg, Leg]
  tail?: 0 | 1 | 2 | 3
  eye?: 'open' | 'blink' | 'closed' | 'wide' | 'up'
  headDy?: number
  headDx?: number
  earFlick?: boolean
  lying?: boolean
  maneFlow?: boolean
}

const LEGS_STAND: [Leg, Leg, Leg, Leg] = [{}, {}, {}, {}]

function drawHornAndMane(g: Grid, cfg: StageCfg, hx: number, hy: number, sx: number, sy: number, flow: number): void {
  // horn: a tapering spike rooted in the FOREHEAD (front of the skull, right
  // above the eye), sweeping slightly forward — 2px at the base, 1px tip
  const bandColors: ColorKey[] = ['horn1', 'horn2', 'horn3', 'horn4', 'horn4']
  const bands = cfg.hornBands
  for (let b = 0; b < bands; b++) {
    const bx = hx + 3 + Math.floor(b / 2)
    const by = hy - 1 - b
    const w = b < Math.ceil(bands / 2) ? 2 : 1
    g.fillRect(bx + (w === 1 ? 1 : 0), by, w, 1, bandColors[b])
  }
  if (cfg.hornLit) {
    g.set(hx + 3 + Math.floor(bands / 2) + 1, hy - 1 - bands, 'hornTip')
  }

  // forelock
  g.fillRect(hx, hy - 1, 2, 1, 'mane')

  // crest along the neck, extras spill onto the back for older stages
  const alongNeck = Math.min(cfg.maneBlocks, 6)
  for (let i = 0; i < alongNeck; i++) {
    const t = alongNeck === 1 ? 0 : i / (alongNeck - 1)
    const mx = Math.round(sx + (hx - sx) * t) - 1 + flow * Math.round(t * 2)
    const my = Math.round(sy + (hy - sy) * t) - 1
    g.fillRect(mx, my, 2, 2, i % 2 === 0 ? 'mane' : 'maneShade')
  }
  for (let i = 0; i < cfg.maneBlocks - alongNeck; i++) {
    g.fillRect(sx - 3 - i * 2 + flow, sy + 1 + i, 2, 2, i % 2 === 0 ? 'maneShade' : 'mane')
  }
}

/** Draws one frame; returns the hat anchor offset {dx, dy}. */
function drawUnicorn(g: Grid, cfg: StageCfg, p: UPose): { dx: number; dy: number } {
  const dy = p.dy ?? 0
  const headDx = p.headDx ?? 0
  const headDy = p.headDy ?? 0
  const eye = p.eye ?? 'open'

  if (p.lying) {
    drawLying(g, cfg, p)
    return { dx: 8, dy: 2 + dy }
  }

  // tail (behind body)
  const tailAll: [number, number][][] = [
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
    [
      [5, 14],
      [3, 14],
      [1, 15],
      [2, 17],
      [4, 18],
      [3, 20]
    ]
  ]
  // anchor the tail to this stage's rump
  const rumpX = Math.round(cfg.bodyCx - cfg.bodyRx)
  const rumpY = Math.round(cfg.bodyCy - cfg.bodyRy + 1)
  tailAll[p.tail ?? 0].slice(0, cfg.tailSegs).forEach(([tx, ty], i) => {
    g.fillRect(tx - 7 + rumpX, ty - 14 + rumpY + dy, 2, 2, i % 2 === 0 ? 'mane' : 'maneShade')
  })

  // legs: [backFar, backNear, frontFar, frontNear]
  const legs = p.legs ?? LEGS_STAND
  const far = [true, false, true, false]
  legs.forEach((leg, i) => {
    const lx = Math.round(cfg.legBaseX[i]) + (leg.dx ?? 0)
    const lift = leg.lift ?? 0
    const topY = cfg.legTopY + dy
    const footY = cfg.footY + dy - lift
    if (footY > topY) g.fillRect(lx, topY, 2, footY - topY + 1, far[i] ? 'shade' : 'coat')
    g.fillRect(lx, footY + 1, 2, 2, cfg.hoofKey)
  })

  // body + belly shading
  g.fillEllipse(cfg.bodyCx, cfg.bodyCy + dy, cfg.bodyRx, cfg.bodyRy, 'coat')
  g.fillRect(Math.round(cfg.bodyCx - cfg.bodyRx + 3), Math.round(cfg.bodyCy + cfg.bodyRy - 1.5) + dy, Math.round(cfg.bodyRx * 2 - 6), 1, 'shade')

  // neck
  const [sx0, sy0] = cfg.shoulder
  const sy = sy0 + dy
  const hx = cfg.headBase[0] + headDx
  const hy = cfg.headBase[1] + headDy + dy
  for (let i = 0; i <= 5; i++) {
    const t = i / 5
    g.fillRect(Math.round(sx0 + (hx - sx0) * t), Math.round(sy + (hy - sy) * t), 3, 4, 'coat')
  }

  // head: skull + snout
  g.fillRect(hx, hy, 5, 5, 'coat')
  g.fillRect(hx + 4, hy + 2, 3, 3, 'coat')
  g.set(hx + 6, hy + 3, 'muzzle')

  // ear
  const earY = hy - 2 - (p.earFlick ? 1 : 0)
  g.fillRect(hx - 1, earY, 2, 2, 'coat')
  g.set(hx - 1, earY + 1, 'earInner')

  drawHornAndMane(g, cfg, hx, hy, sx0, sy, p.maneFlow ? -1 : 0)
  g.fillRect(sx0 - 3, sy + 1, 2, 2, 'maneShade') // shoulder tuft

  // eye — small and composed
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
  // hats are authored centered on x~15.5 with a brim at y~10
  return { dx: hx - 13, dy: hy - 12 }
}

/** Sleeping pose: legs folded, head resting low, tail curled. */
function drawLying(g: Grid, cfg: StageCfg, p: UPose): void {
  const dy = p.dy ?? 0
  const small = cfg.bodyRx < 7
  const rx = small ? 7 : 9
  const cy = 21 + dy

  ;[
    [5, 20],
    [4, 22],
    [5, 24],
    [7, 25]
  ]
    .slice(0, Math.max(2, cfg.tailSegs - 2))
    .forEach(([tx, ty], i) => g.fillRect(tx + (small ? 2 : 0), ty, 2, 2, i % 2 === 0 ? 'mane' : 'maneShade'))

  g.fillEllipse(15, cy, rx, small ? 3.8 : 4.5, 'coat')
  g.fillRect(small ? 12 : 11, 24, 2, 2, cfg.hoofKey)
  g.fillRect(small ? 17 : 18, 24, 2, 2, cfg.hoofKey)

  const hx = small ? 19 : 21
  const hy = (small ? 14 : 13) + dy
  g.fillRect(hx - 2, hy + 3, 4, 5, 'coat')
  g.fillRect(hx, hy, 5, 5, 'coat')
  g.fillRect(hx + 4, hy + 2, 3, 3, 'coat')
  g.set(hx + 6, hy + 3, 'muzzle')

  g.fillRect(hx - 1, hy - 2, 2, 2, 'coat')
  g.set(hx - 1, hy - 1, 'earInner')
  // the horn stays proudly visible even asleep — never fewer than 2 bands
  drawHornAndMane(g, { ...cfg, hornBands: Math.max(2, cfg.hornBands) }, hx, hy, hx - 2, hy + 4, 0)

  g.set(hx + 3, hy + 2, 'eye')
  g.outline()
}

// ---------------------------------------------------------------------------
// Animation definitions (shared across stages)
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
    frames: [{ lying: true }, { lying: true, dy: 1 }, { lying: true, dy: 1 }, { lying: true }]
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

// render all frames per stage (palette applied at write time)
type StageRender = { grids: Record<string, Grid[]>; headDy: Record<string, number[]>; headDx: Record<string, number[]> }
const rendered: Record<number, StageRender> = {}
for (const [stageStr, cfg] of Object.entries(STAGES)) {
  const stage = Number(stageStr)
  const out: StageRender = { grids: {}, headDy: {}, headDx: {} }
  for (const [name, def] of Object.entries(ANIMATIONS)) {
    out.grids[name] = []
    out.headDy[name] = []
    out.headDx[name] = []
    for (const params of def.frames) {
      const g = new Grid(SIZE, SIZE)
      const anchor = drawUnicorn(g, cfg, params)
      out.grids[name].push(g)
      out.headDy[name].push(anchor.dy)
      out.headDx[name].push(anchor.dx)
    }
  }
  rendered[stage] = out
}

let written = 0
for (const [colorId, color] of Object.entries(COLOR_SKINS)) {
  for (const stage of [1, 2, 3, 4]) {
    const skinDir = join(ROOT, 'src/renderer/public/skins', `${colorId}-s${stage}`)
    mkdirSync(skinDir, { recursive: true })
    const r = rendered[stage]
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
      name: `${color.title} unicorn (stage ${stage})`,
      version: 3,
      frameSize: SIZE,
      palette: { ...color.palette },
      animations: {}
    }
    for (const [name, def] of Object.entries(ANIMATIONS)) {
      writeFileSync(join(skinDir, `${name}.png`), PNG.sync.write(gridToPng(r.grids[name], 1, color.palette)))
      manifest.animations[name] = {
        file: `${name}.png`,
        frames: def.frames.length,
        fps: def.fps,
        loop: def.loop,
        headDy: r.headDy[name],
        headDx: r.headDx[name]
      }
    }
    writeFileSync(join(skinDir, 'skin.json'), JSON.stringify(manifest, null, 2))
    written++
  }
}

writeFileSync(join(resourcesDir, 'trayTemplate.png'), PNG.sync.write(drawTrayIcon(16)))
writeFileSync(join(resourcesDir, 'trayTemplate@2x.png'), PNG.sync.write(drawTrayIcon(32)))

// Optional preview: all anims at stage 3 (snow) + idle row per stage per a few colors
const previewFlag = process.argv.indexOf('--preview')
if (previewFlag !== -1) {
  const outDir = process.argv[previewFlag + 1] ?? ROOT
  const scale = 6
  {
    const rows = Object.entries(rendered[3].grids)
    const maxFrames = Math.max(...rows.map(([, g]) => g.length))
    const sheet = new PNG({ width: maxFrames * SIZE * scale, height: rows.length * SIZE * scale })
    rows.forEach(([, grids], row) => {
      const strip = gridToPng(grids, scale)
      PNG.bitblt(strip, sheet, 0, 0, strip.width, strip.height, 0, row * SIZE * scale)
    })
    writeFileSync(join(outDir, 'preview.png'), PNG.sync.write(sheet))
  }
  {
    // growth + colors: idle frame 0 of each stage, one row per color
    const colors = Object.entries(COLOR_SKINS)
    const sheet = new PNG({ width: 4 * SIZE * scale, height: colors.length * SIZE * scale })
    colors.forEach(([, color], row) => {
      for (let stage = 1; stage <= 4; stage++) {
        const strip = gridToPng([rendered[stage].grids['idle'][0]], scale, color.palette)
        PNG.bitblt(strip, sheet, 0, 0, strip.width, strip.height, (stage - 1) * SIZE * scale, row * SIZE * scale)
      }
    })
    writeFileSync(join(outDir, 'growth.png'), PNG.sync.write(sheet))
  }
  console.log(`previews written to ${outDir}`)
}

console.log(`✔ ${written} skins written (${Object.keys(COLOR_SKINS).length} colors x 4 stages, ${Object.keys(ANIMATIONS).length} animations each)`)
console.log(`✔ tray icons written to ${resourcesDir}`)
