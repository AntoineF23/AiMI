import { app, Menu, Tray, nativeImage } from 'electron'
import { join } from 'node:path'

let tray: Tray | null = null

export function createTray(opts: { onToggleVisible: () => void; isVisible: () => boolean }): Tray {
  const iconPath = join(__dirname, '../../resources/trayTemplate.png')
  const icon = nativeImage.createFromPath(iconPath)
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('AiMI — your desktop companion')

  const rebuildMenu = () => {
    const menu = Menu.buildFromTemplate([
      {
        label: opts.isVisible() ? 'Hide AiMI' : 'Show AiMI',
        click: () => {
          opts.onToggleVisible()
          rebuildMenu()
        }
      },
      { type: 'separator' },
      { label: `AiMI v${app.getVersion()}`, enabled: false },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
    tray!.setContextMenu(menu)
  }
  rebuildMenu()

  return tray
}
