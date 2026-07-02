import { contextBridge, ipcRenderer } from 'electron'
import type { GameState } from '../shared/types'
import type { AiSettingsPublic, AiSettingsUpdate, ChatContext, ChatMessage } from '../shared/ai'

const api = {
  /** Toggle whether the pet window captures mouse events (true when cursor is over the pet/UI). */
  setInteractive(interactive: boolean): void {
    ipcRenderer.send('pet:set-interactive', interactive)
  },
  loadState(): Promise<GameState> {
    return ipcRenderer.invoke('state:load')
  },
  saveState(state: GameState): void {
    ipcRenderer.send('state:save', state)
  },
  openSettings(): void {
    ipcRenderer.send('open-settings')
  },
  memory: {
    facts(): Promise<{ id: number; content: string; category: string; source: string; created_at: string }[]> {
      return ipcRenderer.invoke('memory:facts')
    },
    profile(): Promise<string | null> {
      return ipcRenderer.invoke('memory:profile')
    },
    deleteFact(id: number): void {
      ipcRenderer.send('memory:delete-fact', id)
    },
    wipe(): void {
      ipcRenderer.send('memory:wipe')
    },
    recentChat(limit: number): Promise<ChatMessage[]> {
      return ipcRenderer.invoke('memory:recent-chat', limit)
    }
  },
  pet: {
    rename(name: string): void {
      ipcRenderer.send('pet:rename', name)
    },
    setMuted(muted: boolean): void {
      ipcRenderer.send('pet:set-muted', muted)
    },
    onRenamed(cb: (name: string) => void): () => void {
      const listener = (_e: unknown, name: string) => cb(name)
      ipcRenderer.on('pet:renamed', listener)
      return () => ipcRenderer.removeListener('pet:renamed', listener)
    },
    onMuted(cb: (muted: boolean) => void): () => void {
      const listener = (_e: unknown, muted: boolean) => cb(muted)
      ipcRenderer.on('pet:muted', listener)
      return () => ipcRenderer.removeListener('pet:muted', listener)
    }
  },
  onBrainSay(cb: (text: string, isQuestion: boolean) => void): () => void {
    const listener = (_e: unknown, p: { text: string; isQuestion: boolean }) => cb(p.text, p.isQuestion)
    ipcRenderer.on('brain:say', listener)
    return () => ipcRenderer.removeListener('brain:say', listener)
  },
  ai: {
    getSettings(): Promise<AiSettingsPublic> {
      return ipcRenderer.invoke('ai:settings:get')
    },
    setSettings(update: AiSettingsUpdate): Promise<AiSettingsPublic> {
      return ipcRenderer.invoke('ai:settings:set', update)
    },
    test(update: AiSettingsUpdate): Promise<{ ok: boolean; message: string }> {
      return ipcRenderer.invoke('ai:test', update)
    },
    listOllamaModels(baseUrl: string): Promise<string[] | null> {
      return ipcRenderer.invoke('ai:ollama:models', baseUrl)
    },
    chat(requestId: string, messages: ChatMessage[], context: ChatContext): void {
      ipcRenderer.send('ai:chat', { requestId, messages, context })
    },
    cancel(requestId: string): void {
      ipcRenderer.send('ai:chat:cancel', requestId)
    },
    onDelta(cb: (requestId: string, delta: string) => void): () => void {
      const listener = (_e: unknown, p: { requestId: string; delta: string }) => cb(p.requestId, p.delta)
      ipcRenderer.on('ai:chat:delta', listener)
      return () => ipcRenderer.removeListener('ai:chat:delta', listener)
    },
    onDone(cb: (requestId: string, error?: string) => void): () => void {
      const listener = (_e: unknown, p: { requestId: string; error?: string }) => cb(p.requestId, p.error)
      ipcRenderer.on('ai:chat:done', listener)
      return () => ipcRenderer.removeListener('ai:chat:done', listener)
    }
  },
  platform: process.platform
}

export type AimiApi = typeof api

contextBridge.exposeInMainWorld('aimi', api)
