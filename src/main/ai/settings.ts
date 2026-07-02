import { app, safeStorage } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AiProvider, AiSettingsPublic, AiSettingsUpdate } from '../../shared/ai'

interface StoredAiSettings {
  provider: AiProvider | null
  model: string
  baseUrl: string
  /** base64 of safeStorage-encrypted key */
  keyEnc: string
  allowScreenshots?: boolean
  shareActiveApp?: boolean
}

export interface ResolvedAiSettings {
  provider: AiProvider
  model: string
  baseUrl: string
  apiKey: string
}

const settingsPath = () => join(app.getPath('userData'), 'ai-settings.json')

let cache: StoredAiSettings | null = null

function load(): StoredAiSettings {
  if (cache) return cache
  try {
    cache = JSON.parse(readFileSync(settingsPath(), 'utf-8'))
  } catch {
    cache = { provider: null, model: '', baseUrl: '', keyEnc: '' }
  }
  return cache!
}

function persist(): void {
  mkdirSync(dirname(settingsPath()), { recursive: true })
  writeFileSync(settingsPath(), JSON.stringify(cache, null, 2))
}

function decryptKey(s: StoredAiSettings): string {
  if (!s.keyEnc) return ''
  try {
    return safeStorage.decryptString(Buffer.from(s.keyEnc, 'base64'))
  } catch {
    return ''
  }
}

export function getPublicSettings(): AiSettingsPublic {
  const s = load()
  return {
    provider: s.provider,
    model: s.model,
    baseUrl: s.baseUrl,
    hasKey: !!s.keyEnc,
    allowScreenshots: s.allowScreenshots ?? true,
    shareActiveApp: s.shareActiveApp ?? false
  }
}

export function updatePrefs(prefs: { allowScreenshots?: boolean; shareActiveApp?: boolean }): AiSettingsPublic {
  const s = load()
  if (prefs.allowScreenshots !== undefined) s.allowScreenshots = prefs.allowScreenshots
  if (prefs.shareActiveApp !== undefined) s.shareActiveApp = prefs.shareActiveApp
  persist()
  return getPublicSettings()
}

export function updateSettings(update: AiSettingsUpdate): AiSettingsPublic {
  const s = load()
  s.provider = update.provider
  s.model = update.model
  s.baseUrl = update.baseUrl ?? ''
  if (update.apiKey !== undefined) {
    if (update.apiKey === '') {
      s.keyEnc = ''
    } else if (safeStorage.isEncryptionAvailable()) {
      s.keyEnc = safeStorage.encryptString(update.apiKey).toString('base64')
    } else {
      // extremely rare on macOS; better a working app than a lost key
      s.keyEnc = Buffer.from(update.apiKey).toString('base64')
    }
  }
  persist()
  return getPublicSettings()
}

/** null when no provider is configured yet ("pure virtual pet" mode). */
export function getResolvedSettings(): ResolvedAiSettings | null {
  const s = load()
  if (!s.provider || !s.model) return null
  return { provider: s.provider, model: s.model, baseUrl: s.baseUrl, apiKey: decryptKey(s) }
}
