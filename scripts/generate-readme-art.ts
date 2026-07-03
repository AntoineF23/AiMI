/**
 * Renders the README art from the real sprite sheets:
 *   docs/img/hero.png          — all 8 coats side by side (stage 3)
 *   docs/img/color-<id>.png    — one portrait per coat (stage 3 idle)
 *   docs/img/growth.png        — snow coat, stage 1 → 4
 */
import { PNG } from 'pngjs'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs/img')
const FRAME = 32
mkdirSync(OUT, { recursive: true })

const COLORS = ['snow', 'rose', 'storm', 'mint', 'ember', 'lilac', 'gold', 'midnight']

function frame0(skin: string, anim = 'idle'): PNG {
  return PNG.sync.read(readFileSync(join(ROOT, 'src/renderer/public/skins', skin, `${anim}.png`)))
}

function blit(src: PNG, dst: PNG, dx: number, dy: number, scale: number): void {
  for (let y = 0; y < FRAME; y++) {
    for (let x = 0; x < FRAME; x++) {
      const i = (y * src.width + x) << 2
      if (src.data[i + 3] === 0) continue
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const o = ((dy + y * scale + sy) * dst.width + dx + x * scale + sx) << 2
          dst.data[o] = src.data[i]
          dst.data[o + 1] = src.data[i + 1]
          dst.data[o + 2] = src.data[i + 2]
          dst.data[o + 3] = 255
        }
      }
    }
  }
}

// hero: all 8 coats in a row (transparent background)
{
  const scale = 5
  const hero = new PNG({ width: COLORS.length * FRAME * scale, height: FRAME * scale })
  COLORS.forEach((c, i) => blit(frame0(`${c}-s3`), hero, i * FRAME * scale, 0, scale))
  writeFileSync(join(OUT, 'hero.png'), PNG.sync.write(hero))
}

// one portrait per coat
for (const c of COLORS) {
  const scale = 4
  const img = new PNG({ width: FRAME * scale, height: FRAME * scale })
  blit(frame0(`${c}-s3`), img, 0, 0, scale)
  writeFileSync(join(OUT, `color-${c}.png`), PNG.sync.write(img))
}

// growth: snow, stages 1 → 4
{
  const scale = 5
  const img = new PNG({ width: 4 * FRAME * scale, height: FRAME * scale })
  for (let s = 1; s <= 4; s++) blit(frame0(`snow-s${s}`), img, (s - 1) * FRAME * scale, 0, scale)
  writeFileSync(join(OUT, 'growth.png'), PNG.sync.write(img))
}

console.log(`✔ README art written to ${OUT}`)
