import { app, ipcMain } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DEFAULT_GAME_STATE, type GameState } from '../shared/types'

const statePath = () => join(app.getPath('userData'), 'game-state.json')

let saveTimer: NodeJS.Timeout | null = null

function loadState(): GameState {
  try {
    const raw = readFileSync(statePath(), 'utf-8')
    return { ...DEFAULT_GAME_STATE, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_GAME_STATE, createdAt: new Date().toISOString() }
  }
}

function saveState(state: GameState): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      mkdirSync(dirname(statePath()), { recursive: true })
      writeFileSync(statePath(), JSON.stringify(state, null, 2))
    } catch (err) {
      console.error('failed to save game state', err)
    }
  }, 300)
}

export function registerStoreIpc(): void {
  ipcMain.handle('state:load', () => loadState())
  ipcMain.on('state:save', (_e, state: GameState) => saveState(state))
}
