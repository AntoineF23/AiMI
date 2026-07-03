/**
 * Builds build/icon.png (1024x1024) for electron-builder: the pet's idle frame
 * nearest-neighbor-scaled onto a rounded pixel panel.
 */
import { PNG } from 'pngjs'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 1024
const FRAME = 32

const sheet = PNG.sync.read(readFileSync(join(ROOT, 'src/renderer/public/skins/snow-s3/idle.png')))
const icon = new PNG({ width: SIZE, height: SIZE })

const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
const bg = hexToRgb('#2a2046')
const border = hexToRgb('#241a3d')

// rounded-square backdrop (macOS-style, chunky pixel corners)
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
const insideInner = (x: number, y: number): boolean => inside(x, y) && [
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

// cat frame 0 scaled x24 (768px), centered slightly low
const scale = 24
const off = (SIZE - FRAME * scale) / 2
for (let y = 0; y < FRAME; y++) {
  for (let x = 0; x < FRAME; x++) {
    const src = (y * sheet.width + x) << 2
    if (sheet.data[src + 3] === 0) continue
    for (let sy = 0; sy < scale; sy++) {
      for (let sx = 0; sx < scale; sx++) {
        const dx = Math.round(off + x * scale + sx)
        const dy = Math.round(off + 40 + y * scale + sy)
        if (dx < 0 || dy < 0 || dx >= SIZE || dy >= SIZE) continue
        const dst = (dy * SIZE + dx) << 2
        icon.data[dst] = sheet.data[src]
        icon.data[dst + 1] = sheet.data[src + 1]
        icon.data[dst + 2] = sheet.data[src + 2]
        icon.data[dst + 3] = 255
      }
    }
  }
}

mkdirSync(join(ROOT, 'build'), { recursive: true })
writeFileSync(join(ROOT, 'build/icon.png'), PNG.sync.write(icon))
console.log('✔ build/icon.png written')
