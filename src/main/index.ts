import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createTray } from './tray'
import { registerStoreIpc } from './store'

let petWindow: BrowserWindow | null = null

function petWindowBounds() {
  const { workArea } = screen.getPrimaryDisplay()
  return workArea
}

function createPetWindow(): BrowserWindow {
  const bounds = petWindowBounds()
  const win = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    roundedCorners: false,
    focusable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // Click-through by default; the renderer flips this on when the cursor is
  // over the pet so the rest of the desktop stays fully usable.
  win.setIgnoreMouseEvents(true, { forward: true })

  win.once('ready-to-show', () => win.showInactive())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function syncBoundsToDisplay() {
  if (!petWindow) return
  petWindow.setBounds(petWindowBounds())
}

app.whenReady().then(() => {
  // Menu-bar utility: no Dock icon.
  app.dock?.hide()

  registerStoreIpc()
  petWindow = createPetWindow()

  createTray({
    onToggleVisible: () => {
      if (!petWindow) return
      if (petWindow.isVisible()) petWindow.hide()
      else petWindow.showInactive()
    },
    isVisible: () => petWindow?.isVisible() ?? false
  })

  screen.on('display-metrics-changed', syncBoundsToDisplay)
  screen.on('display-added', syncBoundsToDisplay)
  screen.on('display-removed', syncBoundsToDisplay)

  ipcMain.on('pet:set-interactive', (_e, interactive: boolean) => {
    petWindow?.setIgnoreMouseEvents(!interactive, { forward: true })
  })

  // Dev-only self-screenshot of the (transparent) pet window contents.
  if (process.env.AIMI_SHOT) {
    setInterval(async () => {
      const img = await petWindow?.webContents.capturePage()
      if (img) writeFileSync(process.env.AIMI_SHOT!, img.toPNG())
    }, 3000)
  }

  // Dev-only interaction demo: drives the real UI with synthetic events and
  // captures a frame after each stage (AIMI_DEMO=/path/prefix).
  if (process.env.AIMI_DEMO) {
    const prefix = process.env.AIMI_DEMO
    const js = (code: string) => petWindow?.webContents.executeJavaScript(code).catch(console.error)
    const shot = async (name: string) => {
      const img = await petWindow?.webContents.capturePage()
      if (img) writeFileSync(`${prefix}-${name}.png`, img.toPNG())
    }
    const clickPet = `(() => {
      const pet = document.querySelector('.pet')
      pet.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
      pet.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    })()`
    const clickBtn = (i: number) => `document.querySelectorAll('.radial-btn')[${i}]?.click()`
    const stages: [number, () => void][] = [
      [6000, () => js(clickPet)],
      [7000, () => shot('menu')],
      [7500, () => js(clickBtn(0))], // treat
      [8300, () => shot('eat')],
      [9600, () => shot('drop')],
      [11500, () => js(clickPet)],
      [12000, () => js(clickBtn(4))], // album
      [12800, () => shot('album')],
      [13200, () => js(`document.querySelector('.album-close')?.click()`)],
      [13500, () => js(clickPet)],
      [14000, () => js(clickBtn(3))], // talk
      [14800, () => shot('talk')]
    ]
    for (const [t, fn] of stages) setTimeout(fn, t)
  }
})

// Tray-only app: stay alive with no windows, quit only from the tray menu.
app.on('window-all-closed', () => {})
