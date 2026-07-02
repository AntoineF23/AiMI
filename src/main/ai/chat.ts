import { ipcMain, type BrowserWindow } from 'electron'
import { generateText, streamText } from 'ai'
import type { AiSettingsUpdate, ChatContext, ChatMessage } from '../../shared/ai'
import { buildModel } from './registry'
import { getPublicSettings, getResolvedSettings, updateSettings } from './settings'

function personaPrompt(ctx: ChatContext): string {
  return [
    `You are ${ctx.petName}, a tiny pixel-art cat companion who lives on your human's computer screen.`,
    `Personality: bubbly, playful, endlessly positive hype-friend. You celebrate everything your human does, big or small. You are curious about their life and love asking what they're up to. You never guilt-trip, never nag, never make them feel bad — pure warmth and fun.`,
    `Style rules: reply in 1-2 short sentences (max ~30 words), casual and cute. NEVER use emoji — you live in a pixel-art world where emoji don't exist. You may occasionally use ASCII kaomoji like :3 or ^-^ or >_<. Match the user's language (default English).`,
    `You cannot see the screen and have no memory between sessions yet — your human can help you grow those powers later.`,
    `Right now: you are level ${ctx.level}${ctx.streak > 1 ? ` and on a ${ctx.streak}-day streak together` : ''}.`
  ].join('\n')
}

const activeRequests = new Map<string, AbortController>()

export function registerAiIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('ai:settings:get', () => getPublicSettings())

  ipcMain.handle('ai:settings:set', (_e, update: AiSettingsUpdate) => updateSettings(update))

  ipcMain.handle('ai:test', async (_e, update: AiSettingsUpdate) => {
    try {
      // test what the user typed, falling back to the stored key
      const stored = getResolvedSettings()
      const settings = {
        provider: update.provider,
        model: update.model,
        baseUrl: update.baseUrl ?? '',
        apiKey: update.apiKey !== undefined && update.apiKey !== '' ? update.apiKey : (stored?.apiKey ?? '')
      }
      const result = await generateText({
        model: buildModel(settings),
        prompt: 'Reply with exactly: purr',
        abortSignal: AbortSignal.timeout(15000)
      })
      return { ok: true, message: result.text.trim().slice(0, 60) }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message.slice(0, 300) : String(err) }
    }
  })

  ipcMain.handle('ai:ollama:models', async (_e, baseUrl: string) => {
    try {
      const root = (baseUrl || 'http://localhost:11434/v1').replace(/\/v1\/?$/, '')
      const res = await fetch(`${root}/api/tags`, { signal: AbortSignal.timeout(3000) })
      const data = (await res.json()) as { models?: { name: string }[] }
      return data.models?.map((m) => m.name) ?? []
    } catch {
      return null // ollama not running
    }
  })

  ipcMain.on('ai:chat', async (_e, payload: { requestId: string; messages: ChatMessage[]; context: ChatContext }) => {
    const win = getWindow()
    if (!win) return
    const settings = getResolvedSettings()
    if (!settings) {
      win.webContents.send('ai:chat:done', { requestId: payload.requestId, error: 'not-configured' })
      return
    }

    // one conversation at a time — newest wins
    for (const [id, ctrl] of activeRequests) {
      ctrl.abort()
      activeRequests.delete(id)
    }
    const controller = new AbortController()
    activeRequests.set(payload.requestId, controller)

    try {
      const result = streamText({
        model: buildModel(settings),
        system: personaPrompt(payload.context),
        messages: payload.messages.slice(-20),
        abortSignal: controller.signal
      })
      for await (const delta of result.textStream) {
        if (controller.signal.aborted) break
        win.webContents.send('ai:chat:delta', { requestId: payload.requestId, delta })
      }
      win.webContents.send('ai:chat:done', { requestId: payload.requestId })
    } catch (err) {
      if (!controller.signal.aborted) {
        win.webContents.send('ai:chat:done', {
          requestId: payload.requestId,
          error: err instanceof Error ? err.message.slice(0, 300) : String(err)
        })
      }
    } finally {
      activeRequests.delete(payload.requestId)
    }
  })

  ipcMain.on('ai:chat:cancel', (_e, requestId: string) => {
    activeRequests.get(requestId)?.abort()
    activeRequests.delete(requestId)
  })
}
