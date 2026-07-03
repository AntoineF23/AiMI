import { app, BrowserWindow, ipcMain, net, protocol, screen } from 'electron'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createTray } from './tray'
import { registerStoreIpc } from './store'
import { registerAiIpc } from './ai/chat'
import { registerMemoryIpc } from './memory'
import { captureScreen, registerCaptureIpc } from './capture'
import { startBrain } from './brain'

let petWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 600,
    height: 800,
    title: 'AiMI Settings',
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  settingsWindow.once('ready-to-show', () => settingsWindow?.show())
  settingsWindow.on('closed', () => (settingsWindow = null))
  if (process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/settings.html`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'))
  }
}

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

const userSkinsDir = () => join(app.getPath('userData'), 'skins')

app.whenReady().then(() => {
  // Menu-bar utility: no Dock icon.
  app.dock?.hide()

  // Community skins: drop a folder with skin.json + PNGs into userData/skins.
  protocol.handle('aimi-skin', (req) => {
    const url = new URL(req.url)
    const rel = decodeURIComponent(url.hostname + url.pathname)
    const base = userSkinsDir()
    const target = normalize(join(base, rel))
    if (!target.startsWith(base)) return new Response('forbidden', { status: 403 })
    return net.fetch(pathToFileURL(target).toString())
  })

  ipcMain.handle('skins:list', () => {
    try {
      return readdirSync(userSkinsDir(), { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(userSkinsDir(), d.name, 'skin.json')))
        .map((d) => {
          try {
            const manifest = JSON.parse(readFileSync(join(userSkinsDir(), d.name, 'skin.json'), 'utf-8'))
            return { id: d.name, label: String(manifest.name ?? d.name).toUpperCase() }
          } catch {
            return { id: d.name, label: d.name.toUpperCase() }
          }
        })
    } catch {
      return []
    }
  })

  registerStoreIpc()
  registerAiIpc(() => petWindow)
  registerMemoryIpc()
  registerCaptureIpc(() => petWindow)
  petWindow = createPetWindow()
  startBrain(() => petWindow)

  createTray({
    onToggleVisible: () => {
      if (!petWindow) return
      if (petWindow.isVisible()) petWindow.hide()
      else petWindow.showInactive()
    },
    isVisible: () => petWindow?.isVisible() ?? false,
    onOpenSettings: openSettingsWindow
  })

  ipcMain.on('open-settings', openSettingsWindow)

  // settings window → pet window relays
  ipcMain.on('pet:rename', (_e, name: string) => {
    petWindow?.webContents.send('pet:renamed', String(name).slice(0, 20))
  })
  ipcMain.on('pet:set-muted', (_e, muted: boolean) => {
    petWindow?.webContents.send('pet:muted', !!muted)
  })
  ipcMain.on('pet:set-skin', (_e, skinId: string) => {
    petWindow?.webContents.send('pet:skin', String(skinId).slice(0, 60))
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
    const typeAndSend = (text: string) => `(() => {
      const input = document.querySelector('.chat-input-row input')
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(input, ${JSON.stringify(text)})
      input.dispatchEvent(new Event('input', { bubbles: true }))
      document.querySelector('form.chat-input-row').requestSubmit()
    })()`
    const clickBackdrop = `document.querySelector('.backdrop')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))`
    const stages: [number, () => void][] = [
      [6000, () => js(clickPet)],
      [7000, () => shot('menu')],
      [7300, () => js(clickBackdrop)],
      [8000, () => shot('collapsed')],
      [8500, () => js(clickPet)],
      [9000, () => js(clickBtn(3))], // talk → chat panel
      [9800, () => shot('chat-open')],
      [10100, () => js(clickPet)], // pet click over an open panel must collapse, not stack
      [10800, () => shot('chat-collapsed')],
      [19000, () => openSettingsWindow()],
      [21000, async () => {
        const img = await settingsWindow?.webContents.capturePage()
        if (img) writeFileSync(`${prefix}-settings.png`, img.toPNG())
      }]
    ]
    for (const [t, fn] of stages) setTimeout(fn, t)
  }

  // Dev-only: dump exactly what a screen peek would send to the model
  if (process.env.AIMI_TEST_CAPTURE) {
    setTimeout(async () => {
      const r = await captureScreen(petWindow)
      if (r.ok) {
        writeFileSync(process.env.AIMI_TEST_CAPTURE!, Buffer.from(r.dataUrl.split(',')[1], 'base64'))
        console.log('test capture written')
      } else {
        console.error('test capture failed:', r.reason)
      }
    }, 12000)
  }

  // Dev-only games/skins walkthrough
  if (process.env.AIMI_DEMO_GAMES) {
    const prefix = process.env.AIMI_DEMO_GAMES
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
    const openGame = (i: number) => [
      () => js(clickPet),
      () => js(`document.querySelectorAll('.radial-btn')[2]?.click()`),
      () => js(`document.querySelectorAll('.games-item')[${i}]?.click()`)
    ]
    const seq: [number, () => void][] = []
    let t = 5000
    const push = (fn: () => void, wait = 700): void => {
      seq.push([t, fn])
      t += wait
    }
    push(() => js(clickPet))
    push(() => js(`document.querySelectorAll('.radial-btn')[2]?.click()`))
    push(() => shot('games-menu'))
    for (const fn of openGame(0)) push(fn)
    push(() => shot('catch'), 2500)
    push(() => js(`document.querySelector('.game-shell .chat-close')?.click()`))
    for (const fn of openGame(1)) push(fn)
    push(() => shot('pong'), 2500)
    push(() => js(`document.querySelector('.game-shell .chat-close')?.click()`))
    for (const fn of openGame(2)) push(fn)
    push(() => js(`document.querySelectorAll('.ttt-cell')[4]?.click()`), 1200)
    push(() => shot('ttt'))
    push(() => js(`document.querySelector('.game-shell .chat-close')?.click()`))
    push(() => petWindow?.webContents.send('pet:skin', 'mint'), 1500)
    push(() => shot('mint'))
    for (const [when, fn] of seq) setTimeout(fn, when)
  }

  // Dev-only onboarding + proactive-brain walkthrough (with AIMI_TICK_NOW=1)
  if (process.env.AIMI_DEMO_ONBOARD) {
    const prefix = process.env.AIMI_DEMO_ONBOARD
    const js = (code: string) => petWindow?.webContents.executeJavaScript(code).catch(console.error)
    const shot = async (name: string) => {
      const img = await petWindow?.webContents.capturePage()
      if (img) writeFileSync(`${prefix}-${name}.png`, img.toPNG())
    }
    const stages: [number, () => void][] = [
      [5000, () => shot('egg')],
      [5500, () => js(`document.querySelector('.onboard-btn')?.click()`)],
      [6200, () => shot('brain-step')],
      [6500, () => js(`document.querySelector('.onboard-btn.ghost')?.click()`)],
      [7200, () => shot('tips')],
      [7500, () => js(`document.querySelector('.onboard-btn')?.click()`)],
      [8500, () => shot('welcome')],
      [22000, () => shot('brain-tick')],
      [26000, () => shot('brain-tick2')]
    ]
    for (const [t, fn] of stages) setTimeout(fn, t)
  }
})

// Tray-only app: stay alive with no windows, quit only from the tray menu.
app.on('window-all-closed', () => {})
