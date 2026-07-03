/**
 * Generates the default AiMI skin: pixel-art sprite sheets for every animation,
 * a skin.json manifest, and the macOS tray icon.
 *
 * The pet is drawn procedurally (shapes + per-frame params) so animations stay
 * consistent and palettes can be swapped to create skin variants.
 *
 * Output: src/renderer/public/skins/default/*  and  resources/tray*.png
 * Also writes a 6x-scaled contact sheet to scratch for visual inspection
 * when --preview <dir> is passed.
 */
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 32

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const PALETTE = {
  outline: '#241a3d',
  body: '#a78bfa',
  shade: '#8a68f5',
  belly: '#eae2ff',
  earInner: '#ff9ecf',
  blush: '#ff8fb8',
  eye: '#241a3d',
  shine: '#ffffff',
  mouth: '#5c3a6e'
} as const

type ColorKey = keyof typeof PALETTE
type Palette = Record<ColorKey, string>

/** Bundled palette-swap skins — same art, new fur. */
const SKINS: Record<string, { title: string; palette: Palette }> = {
  default: { title: 'AiMI Classic', palette: { ...PALETTE } },
  mint: {
    title: 'Minty',
    palette: {
      ...PALETTE,
      body: '#5eead4',
      shade: '#2dd4bf',
      belly: '#ecfdf5',
      earInner: '#fda4af',
      blush: '#fb7185'
    }
  },
  peach: {
    title: 'Peachy',
    palette: {
      ...PALETTE,
      body: '#fdba74',
      shade: '#fb923c',
      belly: '#fff7ed',
      earInner: '#f9a8d4',
      blush: '#f472b6'
    }
  }
}

function hexToRgba(hex: string): [number, number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255]
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
    this.cells[y * this.w + x] = c
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
        const touching =
          (this.get(x - 1, y) ?? 'outline') !== 'outline' ||
          (this.get(x + 1, y) ?? 'outline') !== 'outline' ||
          (this.get(x, y - 1) ?? 'outline') !== 'outline' ||
          (this.get(x, y + 1) ?? 'outline') !== 'outline'
        if (
          (this.get(x - 1, y) && this.get(x - 1, y) !== 'outline') ||
          (this.get(x + 1, y) && this.get(x + 1, y) !== 'outline') ||
          (this.get(x, y - 1) && this.get(x, y - 1) !== 'outline') ||
          (this.get(x, y + 1) && this.get(x, y + 1) !== 'outline')
        ) {
          void touching
          toOutline.push([x, y])
        }
      }
    }
    for (const [x, y] of toOutline) this.set(x, y, 'outline')
  }
}

// ---------------------------------------------------------------------------
// The cat, parameterized per frame
// ---------------------------------------------------------------------------

interface FrameParams {
  dy?: number // vertical offset (bounce, jumps)
  squash?: number // >0 squashed (wider/shorter), <0 stretched
  blink?: boolean
  eyesClosed?: boolean // cozy ˘‿˘ arcs (sleep)
  wideEyes?: boolean // startled O_O (being dragged)
  lookX?: -1 | 0 | 1
  lookY?: -1 | 0 | 1
  mouthOpen?: 0 | 1 | 2
  smile?: boolean
  tail?: 0 | 1 | 2 | 3
  feet?: 'stand' | 'left' | 'right' | 'dangle' | 'none'
  pawUpY?: number // if set, right paw raised, offset by this many px
  lying?: boolean // sleeping pose
  earLift?: number
}

/** Draws one frame; returns the ear-top Y so hats can track the head. */
function drawCat(g: Grid, p: FrameParams): number {
  const dy = p.dy ?? 0
  const squash = p.squash ?? 0
  const lying = p.lying ?? false
  const earLift = p.earLift ?? 0

  const cx = 16
  const cy = (lying ? 22 : 20) + dy + squash
  const rx = (lying ? 11 : 9) + Math.max(0, squash)
  const ry = (lying ? 6 : 8) - Math.abs(squash) * (squash > 0 ? 1 : -0.5)

  // tail (behind body), 4 sway frames on the right side
  const tailFrames: [number, number][][] = [
    [
      [26, 22],
      [27, 21],
      [28, 20],
      [28, 19]
    ],
    [
      [26, 22],
      [27, 21],
      [28, 21],
      [29, 20]
    ],
    [
      [26, 22],
      [27, 22],
      [28, 22],
      [29, 21]
    ],
    [
      [26, 22],
      [27, 21],
      [27, 20],
      [27, 19]
    ]
  ]
  for (const [tx, ty] of tailFrames[p.tail ?? 0]) {
    g.set(tx, ty + dy + (lying ? 2 : 0), 'shade')
    g.set(tx, ty + 1 + dy + (lying ? 2 : 0), 'shade')
  }

  // ears (triangles), inner pink
  const earTopY = Math.round(cy - ry - 3 - earLift)
  const drawEar = (apexX: number) => {
    for (let i = 0; i < 5; i++) {
      const y = earTopY + i
      const half = Math.floor(i / 2) + (i > 0 ? 1 : 0)
      for (let x = apexX - half; x <= apexX + half; x++) g.set(x, y, 'body')
      if (i >= 2) g.set(apexX, y, 'earInner')
    }
  }
  drawEar(cx - 5)
  drawEar(cx + 5)

  // body
  g.fillEllipse(cx, cy, rx, ry, 'body')

  // belly patch
  if (!lying) g.fillEllipse(cx, cy + 3, rx - 4, ry - 4, 'belly')

  // feet
  const footY = Math.round(cy + ry - 1)
  const feet = p.feet ?? 'stand'
  if (feet === 'stand') {
    g.fillRect(cx - 6, footY, 3, 2, 'shade')
    g.fillRect(cx + 3, footY, 3, 2, 'shade')
  } else if (feet === 'left') {
    g.fillRect(cx - 7, footY - 1, 3, 2, 'shade')
    g.fillRect(cx + 3, footY, 3, 2, 'shade')
  } else if (feet === 'right') {
    g.fillRect(cx - 6, footY, 3, 2, 'shade')
    g.fillRect(cx + 4, footY - 1, 3, 2, 'shade')
  } else if (feet === 'dangle') {
    g.fillRect(cx - 6, footY + 2, 3, 2, 'shade')
    g.fillRect(cx + 3, footY + 2, 3, 2, 'shade')
  }

  // raised paw (wave)
  if (p.pawUpY !== undefined) {
    const py = Math.round(cy - 2 - p.pawUpY)
    g.fillRect(cx + rx - 2, py, 3, 3, 'body')
    g.set(cx + rx - 1, py + 1, 'belly')
  }

  // face
  const eyeY = Math.round(cy - 2)
  const lx = cx - 4 + (p.lookX ?? 0)
  const rxE = cx + 3 + (p.lookX ?? 0)
  const ey = eyeY + (p.lookY ?? 0)

  if (p.eyesClosed) {
    // cozy arcs ˘ ˘
    g.set(lx, ey + 1, 'eye')
    g.set(lx + 1, ey, 'eye')
    g.set(lx - 1, ey, 'eye')
    g.set(rxE, ey + 1, 'eye')
    g.set(rxE + 1, ey, 'eye')
    g.set(rxE - 1, ey, 'eye')
  } else if (p.blink) {
    g.set(lx - 1, ey + 1, 'eye')
    g.set(lx, ey + 1, 'eye')
    g.set(rxE, ey + 1, 'eye')
    g.set(rxE + 1, ey + 1, 'eye')
  } else if (p.wideEyes) {
    g.fillRect(lx - 1, ey - 1, 3, 3, 'eye')
    g.fillRect(rxE - 1, ey - 1, 3, 3, 'eye')
    g.set(lx, ey, 'shine')
    g.set(rxE, ey, 'shine')
  } else {
    g.fillRect(lx - 1, ey - 1, 2, 3, 'eye')
    g.fillRect(rxE, ey - 1, 2, 3, 'eye')
    g.set(lx - 1, ey - 1, 'shine')
    g.set(rxE, ey - 1, 'shine')
  }

  // blush
  g.fillRect(cx - 8, eyeY + 2, 2, 1, 'blush')
  g.fillRect(cx + 7, eyeY + 2, 2, 1, 'blush')

  // mouth
  const my = eyeY + 3
  const mouthOpen = p.mouthOpen ?? 0
  if (mouthOpen === 1) {
    g.fillRect(cx - 1, my, 2, 2, 'mouth')
  } else if (mouthOpen === 2) {
    g.fillRect(cx - 1, my - 1, 3, 3, 'mouth')
    g.set(cx, my + 1, 'blush')
  } else if (p.smile) {
    g.set(cx - 2, my - 1, 'mouth')
    g.set(cx - 1, my, 'mouth')
    g.set(cx, my, 'mouth')
    g.set(cx + 1, my - 1, 'mouth')
  } else {
    g.set(cx - 1, my, 'mouth')
    g.set(cx, my, 'mouth')
  }

  g.outline()
  return earTopY
}

// ---------------------------------------------------------------------------
// Animation definitions
// ---------------------------------------------------------------------------

interface AnimDef {
  fps: number
  loop: boolean
  frames: FrameParams[]
}

const ANIMATIONS: Record<string, AnimDef> = {
  idle: {
    fps: 5,
    loop: true,
    frames: [
      { tail: 0 },
      { tail: 1 },
      { squash: 1, tail: 2, feet: 'stand' },
      { squash: 1, tail: 2, blink: true },
      { tail: 1 },
      { tail: 0 }
    ]
  },
  walk: {
    fps: 8,
    loop: true,
    frames: [
      { feet: 'left', dy: -1, tail: 1 },
      { feet: 'left', dy: 0, tail: 1 },
      { feet: 'stand', dy: 0, tail: 2 },
      { feet: 'right', dy: -1, tail: 2 },
      { feet: 'right', dy: 0, tail: 1 },
      { feet: 'stand', dy: 0, tail: 0 }
    ]
  },
  run: {
    fps: 12,
    loop: true,
    frames: [
      { feet: 'left', dy: -2, squash: -1, tail: 3, earLift: 1 },
      { feet: 'right', dy: -3, squash: -1, tail: 3, earLift: 2 },
      { feet: 'stand', dy: 0, squash: 1, tail: 2 },
      { feet: 'right', dy: -2, squash: -1, tail: 3, earLift: 1 }
    ]
  },
  sleep: {
    fps: 2,
    loop: true,
    frames: [
      { lying: true, eyesClosed: true, tail: 2, feet: 'none' },
      { lying: true, eyesClosed: true, squash: 1, tail: 2, feet: 'none' },
      { lying: true, eyesClosed: true, squash: 1, tail: 1, feet: 'none' },
      { lying: true, eyesClosed: true, tail: 1, feet: 'none' }
    ]
  },
  happy: {
    fps: 10,
    loop: false,
    frames: [
      { squash: 1, smile: true, tail: 1 },
      { dy: -4, squash: -1, smile: true, feet: 'dangle', tail: 3, earLift: 1 },
      { dy: -7, squash: -1, smile: true, eyesClosed: true, feet: 'dangle', tail: 3, earLift: 2 },
      { dy: -7, smile: true, eyesClosed: true, feet: 'dangle', tail: 3, earLift: 2 },
      { dy: -3, smile: true, feet: 'dangle', tail: 1, earLift: 1 },
      { squash: 1, smile: true, tail: 1 }
    ]
  },
  eat: {
    fps: 8,
    loop: false,
    frames: [
      { mouthOpen: 1, tail: 1 },
      { mouthOpen: 2, tail: 1 },
      { mouthOpen: 2, squash: 1, tail: 2 },
      { mouthOpen: 1, squash: 1, tail: 2 },
      { smile: true, eyesClosed: true, tail: 1 },
      { smile: true, eyesClosed: true, squash: 1, tail: 0 }
    ]
  },
  think: {
    fps: 4,
    loop: true,
    frames: [
      { lookX: -1, lookY: -1, tail: 0 },
      { lookX: -1, lookY: -1, tail: 1 },
      { lookX: -1, lookY: -1, tail: 2, squash: 1 },
      { lookX: -1, lookY: -1, tail: 1 }
    ]
  },
  wave: {
    fps: 8,
    loop: true,
    frames: [
      { pawUpY: 4, smile: true, tail: 1 },
      { pawUpY: 6, smile: true, tail: 2 },
      { pawUpY: 4, smile: true, tail: 1 },
      { pawUpY: 6, smile: true, tail: 2 }
    ]
  },
  drag: {
    fps: 4,
    loop: true,
    frames: [
      { wideEyes: true, feet: 'dangle', earLift: 2, tail: 3 },
      { wideEyes: true, feet: 'dangle', earLift: 2, tail: 0, dy: 1 }
    ]
  },
  land: {
    fps: 12,
    loop: false,
    frames: [
      { squash: 2, wideEyes: true, feet: 'stand' },
      { squash: 1, feet: 'stand', smile: true }
    ]
  }
}

// ---------------------------------------------------------------------------
// PNG helpers
// ---------------------------------------------------------------------------

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
// Tray icon: minimal cat-head silhouette (macOS template image: black + alpha)
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
  // 16x16 cat head: ears + round head
  const rows = [
    '..X.........X...',
    '.XX.X.....X.XX..',
    '.XXXX.....XXXX..',
    '.XXXXXXXXXXXXX..',
    '.XXXXXXXXXXXXX..',
    'XXXXXXXXXXXXXXX.',
    'XXXXXXXXXXXXXXX.',
    'XXX..XXXXX..XXX.',
    'XXX..XXXXX..XXX.',
    'XXXXXXXXXXXXXXX.',
    'XXXXXXX.XXXXXXX.',
    'XXXXXX...XXXXXX.',
    '.XXXXXXXXXXXXX..',
    '.XXXXXXXXXXXXX..',
    '..XXXXXXXXXXX...',
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
const BASE_EAR_TOP = 9
for (const [name, def] of Object.entries(ANIMATIONS)) {
  const grids: Grid[] = []
  const headDy: number[] = []
  for (const params of def.frames) {
    const g = new Grid(SIZE, SIZE)
    headDy.push(drawCat(g, params) - BASE_EAR_TOP)
    grids.push(g)
  }
  allGrids[name] = grids
  allHeadDy[name] = headDy
}

for (const [skinName, skin] of Object.entries(SKINS)) {
  const skinDir = join(ROOT, 'src/renderer/public/skins', skinName)
  mkdirSync(skinDir, { recursive: true })
  const manifest: {
    name: string
    version: number
    frameSize: number
    palette: Record<string, string>
    animations: Record<string, { file: string; frames: number; fps: number; loop: boolean; headDy: number[] }>
  } = {
    name: skin.title,
    version: 1,
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
      headDy: allHeadDy[name]
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
  const sheet = new PNG({ width: maxFrames * SIZE * scale, height: rows.length * SIZE * scale, bgColor: { red: 255, green: 255, blue: 255 } })
  rows.forEach(([, grids], row) => {
    const strip = gridToPng(grids, scale)
    PNG.bitblt(strip, sheet, 0, 0, strip.width, strip.height, 0, row * SIZE * scale)
  })
  writeFileSync(join(outDir, 'preview.png'), PNG.sync.write(sheet))
  console.log(`preview written to ${join(outDir, 'preview.png')}`)
}

console.log(`✔ skins written: ${Object.keys(SKINS).join(', ')} (${Object.keys(ANIMATIONS).length} animations each)`)
console.log(`✔ tray icons written to ${resourcesDir}`)
