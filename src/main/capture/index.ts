import { desktopCapturer, ipcMain, screen, systemPreferences, type BrowserWindow } from 'electron'

export type CaptureResult = { ok: true; dataUrl: string } | { ok: false; reason: 'denied' | 'failed' }

/**
 * One downscaled JPEG of the primary display. Only ever called after the user
 * explicitly says yes — the image goes straight to the chosen AI provider and
 * is never written to disk.
 *
 * The pet's own overlay (chat panel, menus, the pet itself) is made invisible
 * for the instant of the capture, so the model sees the human's screen — not
 * its own conversation.
 */
export async function captureScreen(overlay?: BrowserWindow | null): Promise<CaptureResult> {
  try {
    const status = systemPreferences.getMediaAccessStatus('screen')
    if (status === 'denied' || status === 'restricted') return { ok: false, reason: 'denied' }

    if (overlay && !overlay.isDestroyed()) {
      overlay.setOpacity(0)
      // give the compositor a beat to actually remove us from the frame
      await new Promise((r) => setTimeout(r, 180))
    }

    const { size, scaleFactor } = screen.getPrimaryDisplay()
    const maxW = 1280
    const scale = Math.min(1, maxW / (size.width * scaleFactor))
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(size.width * scaleFactor * scale),
        height: Math.round(size.height * scaleFactor * scale)
      }
    })
    const primary = sources[0]
    if (!primary || primary.thumbnail.isEmpty()) return { ok: false, reason: 'failed' }
    return { ok: true, dataUrl: `data:image/jpeg;base64,${primary.thumbnail.toJPEG(72).toString('base64')}` }
  } catch {
    return { ok: false, reason: 'failed' }
  } finally {
    if (overlay && !overlay.isDestroyed()) overlay.setOpacity(1)
  }
}

export function registerCaptureIpc(getOverlay: () => BrowserWindow | null): void {
  ipcMain.handle('capture:take', () => captureScreen(getOverlay()))
}
