import { contextBridge, ipcRenderer } from 'electron'
import type { GameState } from '../shared/types'

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
  platform: process.platform
}

export type AimiApi = typeof api

contextBridge.exposeInMainWorld('aimi', api)
