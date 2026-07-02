/**
 * Generates every pixel-art icon used by the UI (menu icons, stickers, coin,
 * gift...) from ASCII pixel maps. 16x16 each, written to src/renderer/public/px/.
 * AiMI's UI is 100% pixel art — no emoji, no external images.
 *
 * Rows shorter than 16 chars are right-padded with transparency; longer rows
 * throw so art mistakes fail loudly. `--preview <dir>` writes a contact sheet.
 */
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 16

const OUTLINE = '#241a3d'

interface IconDef {
  palette: Record<string, string>
  rows: string[]
}

const grid = (s: string): string[] => s.split('\n').filter((r) => r.length > 0)

const ICONS: Record<string, IconDef> = {
  heart: {
    palette: { R: '#ff5c8a', W: '#ffd0e0' },
    rows: grid(`
..oo.....oo
.oRRo...oRRo
oRWRRo.oRRRRo
oRWRRRoRRRRRo
oRWRRRRRRRRRo
oRRRRRRRRRRRo
.oRRRRRRRRRo
..oRRRRRRRo
...oRRRRRo
....oRRRo
.....oRo
......o`)
  },
  apple: {
    palette: { R: '#ff5555', D: '#d13a3a', L: '#4ade80', S: '#8a5a2b', W: '#ffb3b3' },
    rows: grid(`
.......oo
......oSo.oo
.......oSoLLo
....oo.oSLLo
...oRRoRRoo
..oRRRRRRRRo
.oRWRRRRRRRRo
.oRWRRRRRRRRo
.oRWRRRRRRDRo
.oRRRRRRRRDRo
.oRRRRRRRDDRo
..oRRRRRDDRo
...oRRoRRRo
....oo.ooo`)
  },
  cookie: {
    palette: { B: '#d9a05b', D: '#b57f3f', C: '#5c3a1e' },
    rows: grid(`
.....ooooo
...ooBBBBBoo
..oBBBCBBBBBo
.oBBBBBBBCBBo
.oBCBBBBBBBBo
oBBBBBBCBBBBBo
oBBBBBBBBBBCBo
oBCBBBBBBBBBBo
oBBBBCBBBBBBBo
.oBBBBBBBCBBo
.oBBCBBBBBBDo
..oBBBBBCBDo
...ooBDBBDo
.....ooooo`)
  },
  clover: {
    palette: { G: '#4ade80', D: '#2eab5c' },
    rows: grid(`
...oo...oo
..oGGo.oGGo
.oGGGGoGGGGo
.oGGGGGGGGGo
..oGGGGGGGo
.oGGGGGGGGGo
oGGGGoGoGGGGo
oGGGGoDoGGGGo
.oGGo.oD.oGo
..oo..oDo.o
......oDo
.......o`)
  },
  ball: {
    palette: { W: '#f4f4f8', K: '#241a3d', G: '#d1d5db' },
    rows: grid(`
.....ooooo
...ooWWWWWoo
..oWWWKKKWWWo
.oWWWWKKKWWWWo
.oWKWWKKKWWKWo
oWWKKWWWWWKKWWo
oWWWKWWWWWKWWWo
oWWWWWWWWWWWWWo
oWKWWWWWWWWWKWo
.oKKWWWWWWWKKo
.oWWKWWWWWKWWo
..oWWKGKGKWWo
...ooWWWWWoo
.....ooooo`)
  },
  flower: {
    palette: { P: '#ff9ecf', Y: '#ffd75e', G: '#4ade80' },
    rows: grid(`
.....oo
....oPPo
..oooPPooo
.oPPoPPoPPo
.oPPPPPPPPo
..ooPYYPoo
.oPPoYYoPPo
.oPPPPPPPPo
..oPPoPPoo
...oooPoo
.....oGo
....oGGo
.....oGo
......o`)
  },
  donut: {
    palette: { I: '#ff9ecf', D: '#d9a05b', Y: '#ffd75e', B: '#60a5fa' },
    rows: grid(`
.....ooooo
...ooIIIIIoo
..oIIYIIIBIIo
.oIIIIIoIIIIIo
.oIBIIoooIIYIo
oIIIIoo.ooIIIIo
oIYIIo...oIIBIo
oIIIIo...oIIIIo
oIIIIoo.ooIYIIo
.oIIIIoooIIIIo
.oDIBIIIIIIDo
..oDDIIYIIDo
...ooDDDDDo
.....ooooo`)
  },
  paw: {
    palette: { P: '#a78bfa', D: '#8a68f5' },
    rows: grid(`
..oo....oo
.oPPo..oPPo
.oPPo..oPPo
..oo.oo.oo
....oPPo
.oo.oPPo.oo
oPPo.oo.oPPo
oPPo....oPPo
.oo.oooo.oo
...oPPPPo
..oPPPPPPo
..oPDPPDPo
..oPDDDDPo
...oooooo`)
  },
  mug: {
    palette: { B: '#8a68f5', C: '#5c3a1e', W: '#f4f4f8' },
    rows: grid(`
...o..o..o
...o..o..o
....o..o
....o..o
..oooooooo
.oCCCCCCCCo
.oBBBBBBBBoo
.oBBBBBBBBoBo
.oBWBBBBBBoBo
.oBWBBBBBBoBo
.oBBBBBBBBoo
.oBBBBBBBBo
..oBBBBBBo
...oooooo`)
  },
  cassette: {
    palette: { G: '#9aa3b2', D: '#6b7280', W: '#f4f4f8', K: '#241a3d' },
    rows: grid(`
.
.ooooooooooooo
.oGGGGGGGGGGGo
.oGDDDDDDDDDGo
.oGDWDDDDDWDGo
.oGWKWDDDWKWGo
.oGDWDDDDDWDGo
.oGDDDDDDDDDGo
.oGGGGGGGGGGGo
.oGDGGGGGGGDGo
.oGDGGGGGGGDGo
.ooooooooooooo`)
  },
  boba: {
    palette: { C: '#f7e8d8', T: '#d9a05b', P: '#5c3a1e', S: '#ff9ecf' },
    rows: grid(`
.........oo
........oSSo
.......oSSo
......oSSo
..ooooSSoooo
..oCCoSSoCCo
..oCCooooCCo
..oCTTTTTTCo
..oCTTTTTTCo
...oTTTTTTo
...oTPTTPTo
...oPTPPTPo
....oPPPPo
.....oooo`)
  },
  gamepad: {
    palette: { G: '#9aa3b2', K: '#241a3d', R: '#ff5555', B: '#60a5fa' },
    rows: grid(`
.
.
...ooooooooo
..oGGGGGGGGGo
.oGGGKGGGGGGGo
oGGGKKKGGGBGGGo
oGGGGKGGGRGRGGo
oGGGGGGGGGBGGGo
oGGGGGGGGGGGGGo
oGGGoGGGGGoGGGo
.oGGooooooGGGo
..oGGo...oGGo
...ooo...ooo`)
  },
  cactus: {
    palette: { G: '#4ade80', D: '#2eab5c', P: '#d97742' },
    rows: grid(`
......oo
.....oGGo
.....oGGGo
.oo..oGDGo..o
oGGo.oGGGo.oGo
oGGo.oGDGo.oGo
.oGooGGGGooGo
..oGGGDGGGGo
...ooGGGoo
.....oGGo
....oooooo
....oPPPPo
.....oPPo
.....oooo`)
  },
  sushi: {
    palette: { W: '#f4f4f8', O: '#ff9d5c', K: '#241a3d', D: '#e8834e' },
    rows: grid(`
.
.
....ooooooo
..ooOOOOOOOoo
.oOOODOOODOOOo
oOODOOOODOOOODo
oOOOOOOOOOOOOOo
.oooooooooooo
.oWWWWWWWWWWWo
oWWWWWWWWWWWWWo
oWWWWWWWWWWWWWo
.oWWWWWWWWWWWo
..ooooooooooo`)
  },
  disco: {
    palette: { S: '#cbd5e1', W: '#f4f4f8', D: '#94a3b8' },
    rows: grid(`
.......o
.......o
.....ooooo
...ooWSSSDoo
..oSSoSSoSSDo
.oWSSoWWoSSSDo
.oSooooooooSo
oSSSoWWoSSoSDo
oWSSoWWoSSoSDo
.oSooooooooSo
.oWSSoSSoSSDo
..oSSoWWoSDo
...ooSSSDoo
.....ooooo`)
  },
  rocket: {
    palette: { W: '#e5e7eb', R: '#ff5555', B: '#67e8f9', F: '#ffd75e' },
    rows: grid(`
.......oo
......oWWo
.....oWWWWo
.....oWWWWo
....oWWBBWWo
....oWBBBBWo
....oWWBBWWo
...oRWWWWWWRo
..oRRWWWWWWRRo
.oRRRWWWWWWRRRo
.oRRooFFFFooRRo
.oo..oFFFFo..oo
......oFFo
.......oo`)
  },
  gem: {
    palette: { C: '#67e8f9', B: '#22d3ee', W: '#f4f4f8' },
    rows: grid(`
.
.
..ooooooooooo
.oCWCoBBBoCCBo
oCWCCoBBBoCCCBo
oCWCCoBBBoCCCBo
.oCCoBBBBBoCBo
..oCoBBBBBoBo
...oCoBBBoBo
....oCoBoBo
.....oCoBo
......oBo
.......o`)
  },
  rainbow: {
    palette: { R: '#ff5555', Y: '#ffd75e', G: '#4ade80', B: '#60a5fa' },
    rows: grid(`
.
.
.
.....oooooo
...ooRRRRRRoo
..oRRRRRRRRRRo
.oRRooYYYYooRRo
.oRoYYYYYYYYoRo
oRoYYooGGooYYoRo
oRoYoGGGGGGoYoRo
oRoYoGoBBoGoYoRo
oRoYoGoBBoGoYoRo
oooooooooooooooo`)
  },
  ufo: {
    palette: { G: '#9aa3b2', D: '#6b7280', C: '#67e8f9', Y: '#ffd75e' },
    rows: grid(`
.
.
.....ooooo
....oCCCCCo
....oCCCCCo
..ooGGGGGGGoo
.oGGGGGGGGGGGo
oGGYGGYGGYGGYGo
oGGGGGGGGGGGGGo
.oDDoooooooDDo
..oo.......oo
.
....o..o..o
....o..o..o`)
  },
  crown: {
    palette: { Y: '#ffd75e', O: '#ff9d3f', R: '#ff5c8a' },
    rows: grid(`
.
.
.o.....o.....o
oYo...oYo...oYo
oYYo.oYYYo.oYYo
oYYYoYYYYYoYYYo
oYYYYYYYYYYYYYo
oYYYYYRRYYYYYYo
oYYYYYRRYYYYYYo
oYOYYYYYYYYYOYo
oYOOYYYYYYYOOYo
oYYYYYYYYYYYYYo
oOOOOOOOOOOOOOo
ooooooooooooooo`)
  },
  planet: {
    palette: { P: '#a78bfa', D: '#8a68f5', R: '#ffd75e' },
    rows: grid(`
.
.....ooooo
....oPPPPPo.oo
...oPPDPPPPoRo
..oPPPPPPPPRo
.oRoPPPDPPRo
.oRRoPPPPRoPo
..oRRoPPRoPPo
..oPoRRRRoPPo
..oPPoPPRRoo
...oPPPPPoRRo
....oPPPPo.oo
.....ooooo`)
  },
  goldcat: {
    palette: { Y: '#ffd75e', O: '#ff9d3f', K: '#241a3d' },
    rows: grid(`
.
..o.........o
.oYo.......oYo
.oYYo.....oYYo
.oYYYooooOYYYo
.oYYYYYYYYYYYo
oYYYYYYYYYYYYYo
oYYKKYYYYYKKYYo
oYYKKYYYYYKKYYo
oYYYYYYOYYYYYYo
.oYYYYOOOYYYYo
.oYYYYYYYYYYYo
..oYYYYYYYYYo
...ooooooooo`)
  },
  bubble: {
    palette: { W: '#f4f4f8', K: '#241a3d' },
    rows: grid(`
.
..ooooooooooo
.oWWWWWWWWWWWo
oWWWWWWWWWWWWWo
oWWWWWWWWWWWWWo
oWWKKWWKKWWKKWo
oWWKKWWKKWWKKWo
oWWWWWWWWWWWWWo
oWWWWWWWWWWWWWo
.oWWWWWWWWWWWo
..ooooWWooooo
.....oWWo
.....oWo
......o`)
  },
  book: {
    palette: { P: '#a78bfa', D: '#8a68f5', W: '#f4f4f8' },
    rows: grid(`
.
..ooooooooooo
.oPPPPPPPPPPPo
.oPPPPPPPPPPPo
.oPPWWWWWWWPPo
.oPPPPPPPPPPPo
.oPPWWWWWPPPPo
.oPPPPPPPPPPPo
.oPPPPPPPPPPPo
.oPDPPPPPPPDPo
.oDDDDDDDDDDDo
.oWWWWWWWWWWWo
.oDDDDDDDDDDDo
..ooooooooooo`)
  },
  gear: {
    palette: { G: '#9aa3b2', D: '#6b7280' },
    rows: grid(`
.
......oo
...oo.oGo.oo
...oGooGooGo
....oGGGGGo
..ooGGGGGGGoo
..oGGGooGGGGo
.oGGGoDDoGGGGo
.oGGGoDDoGGGGo
..oGGGooGGGGo
..ooGGGGGGGoo
....oGGGGGo
...oGooGooGo
...oo.oGo.oo
......oo`)
  },
  gift: {
    palette: { R: '#ff5555', Y: '#ffd75e', D: '#d13a3a' },
    rows: grid(`
.
...oo.....oo
..oYYo...oYYo
..oYYYo.oYYYo
...oYYYoYYYo
.oooooYYYooooo
.oRRRRoYoRRRRo
.oYYYYYYYYYYYo
.oRRRRoYoRRRRo
.oRRRRoYoRRRRo
.oRDRRoYoRRDRo
.oRDRRoYoRRDRo
.oRRRRoYoRRRRo
.ooooooooooooo`)
  },
  coin: {
    palette: { Y: '#ffd75e', O: '#ff9d3f', W: '#fff3c4' },
    rows: grid(`
.
.....ooooo
...ooYYYYYoo
..oYWYYYYYYYo
.oYWYYooooYYYo
.oYWYYoYYoYYYo
oYWYYYoYYoYYYOo
oYYYYYoYYoYYYOo
oYYYYYoYYoYYOOo
.oYYYYoYYoYOOo
.oYYYYooooOOOo
..oYYYYYYOOOo
...ooYYOOOoo
.....ooooo`)
  },
  star: {
    palette: { Y: '#ffd75e', O: '#ff9d3f' },
    rows: grid(`
.
.......o
......oYo
......oYo
.....oYYYo
.ooooYYYYYoooo
.oYYYYYYYYYYYo
..oYYYYYYYYYo
...oYYYYYYYo
....oYYYYYo
....oYYYYYo
...oYYYooYYo
...oYoo..ooYo
...oo......oo`)
  },
  question: {
    palette: { W: '#f4f4f8', D: '#cbd5e1' },
    rows: grid(`
.
....oooooo
...oWWWWWWo
..oWWooooWWo
..oWWo..oWWo
..oooo..oWWo
.......oWWDo
......oWWDo
......oWWo
......oWWo
.......oo
.
......oo
......oo`)
  },
  xmark: {
    palette: { W: '#f4f4f8' },
    rows: grid(`
.
.
..oo......oo
.oWWo....oWWo
..oWWo..oWWo
...oWWooWWo
....oWWWWo
.....oWWo
....oWWWWo
...oWWooWWo
..oWWo..oWWo
.oWWo....oWWo
..oo......oo`)
  },
  send: {
    palette: { W: '#f4f4f8' },
    rows: grid(`
.
.
....oo
....oWo
....oWWo
....oWWWo
....oWWWWo
....oWWWWWo
....oWWWWo
....oWWWo
....oWWo
....oWo
....oo`)
  },
  camera: {
    palette: { G: '#9aa3b2', D: '#6b7280', B: '#67e8f9', K: '#241a3d' },
    rows: grid(`
.
.
..oo
.oGGooooo
.oGGGGGGGoooo
.oGGGGGGGGGGGo
.oGGooGGGGGGGo
.oGoBBoGGGGGGo
.oGoBBoGGGGDGo
.oGGooGGGGGDGo
.oGGGGGGGGDDGo
.oGGGGGGGDDGGo
.ooooooooooooo`)
  },
  eye: {
    palette: { W: '#f4f4f8', B: '#67e8f9', K: '#241a3d' },
    rows: grid(`
.
.
.
....ooooo
..ooWWWWWoo
.oWWWooWWWWo
oWWWoKKoBWWWo
oWWoKKKKoBWWWo
oWWoKWKKoBWWWo
oWWWoKKoBWWWo
.oWWWooWWWWo
..ooWWWWWoo
....ooooo`)
  },
  egg: {
    palette: { W: '#f4f4f8', P: '#ff9ecf', S: '#e2e2ec' },
    rows: grid(`
.
.....ooooo
....oWWWWWo
...oWWWWWWWo
..oWWWPWWWWWo
..oWWPWPWWWWo
..oWWWWWWWSWo
.oWWWPWWWWWSWo
.oWWPWPWWWWSWo
.oWWWWWWWWSSWo
.oWWWWWWWWSWWo
..oWWWWWSSWo
..oWWSSSSWo
...ooooooo`)
  },
  zzz: {
    palette: { W: '#a78bfa' },
    rows: grid(`
.
.oWWWWo
....Wo
...Wo
..Wo
.oWWWWo`)
  }
}

function hexToRgba(hex: string): [number, number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255]
}

function renderIcon(name: string, def: IconDef): PNG {
  const png = new PNG({ width: SIZE, height: SIZE })
  def.rows.forEach((row, y) => {
    if (row.length > SIZE) throw new Error(`icon "${name}" row ${y} is ${row.length} chars (max ${SIZE})`)
    if (y >= SIZE) throw new Error(`icon "${name}" has more than ${SIZE} rows`)
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.') continue
      const hex = ch === 'o' ? OUTLINE : def.palette[ch]
      if (!hex) throw new Error(`icon "${name}": unknown palette char "${ch}" at ${x},${y}`)
      const [r, g, b, a] = hexToRgba(hex)
      const idx = (y * SIZE + x) << 2
      png.data[idx] = r
      png.data[idx + 1] = g
      png.data[idx + 2] = b
      png.data[idx + 3] = a
    }
  })
  return png
}

const outDir = join(ROOT, 'src/renderer/public/px')
mkdirSync(outDir, { recursive: true })
for (const [name, def] of Object.entries(ICONS)) {
  writeFileSync(join(outDir, `${name}.png`), PNG.sync.write(renderIcon(name, def)))
}
console.log(`✔ ${Object.keys(ICONS).length} pixel icons written to ${outDir}`)

const previewFlag = process.argv.indexOf('--preview')
if (previewFlag !== -1) {
  const dir = process.argv[previewFlag + 1] ?? ROOT
  const scale = 6
  const names = Object.keys(ICONS)
  const cols = 8
  const rowsN = Math.ceil(names.length / cols)
  const sheet = new PNG({ width: cols * (SIZE + 2) * scale, height: rowsN * (SIZE + 2) * scale })
  // dark backdrop so light icons are visible
  for (let i = 0; i < sheet.data.length; i += 4) {
    sheet.data[i] = 40
    sheet.data[i + 1] = 32
    sheet.data[i + 2] = 64
    sheet.data[i + 3] = 255
  }
  names.forEach((name, i) => {
    const icon = renderIcon(name, ICONS[name])
    const big = new PNG({ width: SIZE * scale, height: SIZE * scale })
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const src = (y * SIZE + x) << 2
        if (icon.data[src + 3] === 0) continue
        for (let sy = 0; sy < scale; sy++)
          for (let sx = 0; sx < scale; sx++) {
            const dst = ((y * scale + sy) * big.width + x * scale + sx) << 2
            big.data[dst] = icon.data[src]
            big.data[dst + 1] = icon.data[src + 1]
            big.data[dst + 2] = icon.data[src + 2]
            big.data[dst + 3] = icon.data[src + 3]
          }
      }
    const cx = (i % cols) * (SIZE + 2) * scale + scale
    const cy = Math.floor(i / cols) * (SIZE + 2) * scale + scale
    PNG.bitblt(big, sheet, 0, 0, big.width, big.height, cx, cy)
  })
  writeFileSync(join(dir, 'icons-preview.png'), PNG.sync.write(sheet))
  console.log(`preview written to ${join(dir, 'icons-preview.png')}`)
}
