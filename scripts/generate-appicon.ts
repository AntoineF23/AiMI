/**
 * Builds build/icon.png (1024x1024) for electron-builder: a pixel-art
 * unicorn SELFIE — close-up head, horn thrust forward, one hoof holding a
 * phone with a tiny unicorn on screen — on a rounded pixel panel.
 */
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 1024
const GRID = 32

const C = {
  outline: '#241a3d',
  coat: '#f2f2f7',
  shade: '#c9cddd',
  mane: '#4f8fd9',
  maneShade: '#3a6fb0',
  eye: '#241a3d',
  shine: '#ffffff',
  muzzle: '#9a9ab0',
  horn1: '#c05a5a',
  horn2: '#cf9a4f',
  horn3: '#5a9a6f',
  horn4: '#7a6fd0',
  phone: '#241a3d',
  screen: '#b8ffd9',
  spark: '#ffd75e'
} as const

type Key = keyof typeof C
const cells: (Key | null)[] = new Array(GRID * GRID).fill(null)
const set = (x: number, y: number, c: Key): void => {
  if (x >= 0 && y >= 0 && x < GRID && y < GRID) cells[Math.round(y) * GRID + Math.round(x)] = c
}
const get = (x: number, y: number): Key | null =>
  x >= 0 && y >= 0 && x < GRID && y < GRID ? cells[y * GRID + x] : null
const rect = (x0: number, y0: number, w: number, h: number, c: Key): void => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c)
}
const ellipse = (cx: number, cy: number, rx: number, ry: number, c: Key): void => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx
      const dy = (y - cy) / ry
      if (dx * dx + dy * dy <= 1) set(x, y, c)
    }
}

// ---- the selfie scene (facing right) --------------------------------------

// flowing mane behind the head
ellipse(6, 12, 4, 8, 'mane')
ellipse(5, 22, 3.5, 6, 'maneShade')
ellipse(8, 6, 3, 3, 'mane')

// head: big skull + snout
ellipse(14, 15, 8, 9, 'coat')
ellipse(23, 18, 6, 5, 'coat')
set(28, 17, 'muzzle') // nostril

// mane crest flowing over the top of the head
ellipse(11, 4, 4, 3, 'mane')
rect(14, 5, 3, 2, 'maneShade')

// horn: forward 45° from the forehead
rect(17, 5, 2, 1, 'horn1')
rect(18, 4, 2, 1, 'horn2')
rect(19, 3, 2, 1, 'horn3')
rect(20, 2, 1, 1, 'horn4')
set(21, 1, 'horn4')

// eye: composed but delighted (selfie face)
rect(17, 12, 2, 3, 'eye')
set(17, 12, 'shine')

// foreleg + hoof holding the phone up
rect(23, 28, 3, 4, 'coat')
rect(22, 25, 4, 4, 'coat')

// the phone — screen shows the photo preview: a tiny unicorn
rect(15, 22, 7, 9, 'phone')
rect(16, 23, 5, 7, 'screen')
rect(17, 26, 2, 2, 'coat')
set(19, 25, 'horn3')
set(18, 26, 'eye')

// sparkles
set(28, 6, 'spark')
set(27, 5, 'spark')
set(29, 5, 'spark')
set(28, 4, 'spark')
set(4, 28, 'spark')
set(3, 27, 'spark')
set(5, 27, 'spark')
set(4, 26, 'spark')

// outline pass
{
  const toOutline: [number, number][] = []
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (get(x, y) !== null) continue
      if (
        (get(x - 1, y) && get(x - 1, y) !== 'outline') ||
        (get(x + 1, y) && get(x + 1, y) !== 'outline') ||
        (get(x, y - 1) && get(x, y - 1) !== 'outline') ||
        (get(x, y + 1) && get(x, y + 1) !== 'outline')
      )
        toOutline.push([x, y])
    }
  for (const [x, y] of toOutline) set(x, y, 'outline')
}

// ---- compose onto the rounded panel ---------------------------------------

const icon = new PNG({ width: SIZE, height: SIZE })
const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
const bg = hexToRgb('#2a2046')
const border = hexToRgb('#241a3d')

const margin = 64
const radius = 176
const inside = (x: number, y: number): boolean => {
  const l = margin
  const r = SIZE - margin
  if (x < l || x >= r || y < l || y >= r) return false
  const cx = Math.max(l + radius - x, x - (r - radius), 0)
  const cy = Math.max(l + radius - y, y - (r - radius), 0)
  return cx * cx + cy * cy <= radius * radius
}
const borderW = 20
const insideInner = (x: number, y: number): boolean =>
  inside(x, y) &&
  [
    [x - borderW, y],
    [x + borderW, y],
    [x, y - borderW],
    [x, y + borderW]
  ].every(([a, b]) => inside(a, b))

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (!inside(x, y)) continue
    const [r, g, b] = insideInner(x, y) ? bg : border
    const idx = (y * SIZE + x) << 2
    icon.data[idx] = r
    icon.data[idx + 1] = g
    icon.data[idx + 2] = b
    icon.data[idx + 3] = 255
  }
}

const scale = 26 // 32 * 26 = 832px of art in a 1024 canvas
const off = (SIZE - GRID * scale) / 2
for (let y = 0; y < GRID; y++) {
  for (let x = 0; x < GRID; x++) {
    const key = get(x, y)
    if (!key) continue
    const [r, g, b] = hexToRgb(C[key])
    for (let sy = 0; sy < scale; sy++) {
      for (let sx = 0; sx < scale; sx++) {
        const dx = Math.round(off + x * scale + sx)
        const dy = Math.round(off + y * scale + sy)
        if (dx < 0 || dy < 0 || dx >= SIZE || dy >= SIZE) continue
        const dst = (dy * SIZE + dx) << 2
        icon.data[dst] = r
        icon.data[dst + 1] = g
        icon.data[dst + 2] = b
        icon.data[dst + 3] = 255
      }
    }
  }
}

mkdirSync(join(ROOT, 'build'), { recursive: true })
writeFileSync(join(ROOT, 'build/icon.png'), PNG.sync.write(icon))
console.log('✔ build/icon.png written (unicorn selfie)')
