import { desktopCapturer, ipcMain, screen, systemPreferences } from 'electron'

export type CaptureResult = { ok: true; dataUrl: string } | { ok: false; reason: 'denied' | 'failed' }

/**
 * One downscaled JPEG of the primary display. Only ever called after the user
 * explicitly says yes — the image goes straight to the chosen AI provider and
 * is never written to disk.
 */
export async function captureScreen(): Promise<CaptureResult> {
  try {
    const status = systemPreferences.getMediaAccessStatus('screen')
    if (status === 'denied' || status === 'restricted') return { ok: false, reason: 'denied' }

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
  }
}

export function registerCaptureIpc(): void {
  ipcMain.handle('capture:take', () => captureScreen())
}
