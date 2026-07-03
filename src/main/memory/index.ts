import { ipcMain } from 'electron'
import { getDb } from './db'

export interface Fact {
  id: number
  content: string
  category: string
  confidence: number
  source: string
  created_at: string
}

export interface Episode {
  id: number
  kind: string
  content: string
  created_at: string
}

// ---------------------------------------------------------------- facts ---

export function listFacts(): Fact[] {
  return getDb().prepare('SELECT * FROM facts ORDER BY updated_at DESC').all() as unknown as Fact[]
}

const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'is', 'are', 'has', 'have', 'with', 'for', 'on', 'in', 'at', 'his', 'her', 'their', 'very', 'really'])

function significantWords(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-zà-ÿ0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  )
}

/** Containment-friendly overlap: 1.0 when one fact's words are a subset of the other's. */
function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let common = 0
  for (const w of a) if (b.has(w)) common++
  return common / Math.min(a.size, b.size)
}

export function addFact(content: string, category = 'misc', source = 'chat', confidence = 0.7): void {
  const trimmed = content.trim().slice(0, 120)
  if (!trimmed) return
  const db = getDb()
  // near-duplicate detection: if an existing fact covers (or is covered by)
  // this one, keep the SHORTER wording instead of piling up variants
  const words = significantWords(trimmed)
  for (const fact of listFacts()) {
    if (similarity(words, significantWords(fact.content)) >= 0.6) {
      const shorter = trimmed.length < fact.content.length ? trimmed : fact.content
      db.prepare(
        "UPDATE facts SET content = ?, confidence = min(1.0, confidence + 0.1), updated_at = datetime('now') WHERE id = ?"
      ).run(shorter, fact.id)
      return
    }
  }
  db.prepare('INSERT INTO facts (content, category, source, confidence) VALUES (?, ?, ?, ?)').run(
    trimmed,
    category,
    source,
    confidence
  )
}

/** Atomic rewrite used by memory compaction. */
export function replaceAllFacts(contents: string[], source = 'compaction'): void {
  const db = getDb()
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM facts')
    const stmt = db.prepare('INSERT INTO facts (content, category, source, confidence) VALUES (?, ?, ?, ?)')
    for (const c of contents) {
      const trimmed = c.trim().slice(0, 120)
      if (trimmed) stmt.run(trimmed, 'misc', source, 0.8)
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function deleteFact(id: number): void {
  getDb().prepare('DELETE FROM facts WHERE id = ?').run(id)
}

export function wipeMemory(): void {
  const db = getDb()
  db.exec('DELETE FROM facts; DELETE FROM episodes; DELETE FROM kv;')
}

// ------------------------------------------------------------- episodes ---

export function recordEpisode(kind: 'chat_user' | 'chat_pet' | 'event', content: string): void {
  const trimmed = content.trim()
  if (!trimmed) return
  getDb().prepare('INSERT INTO episodes (kind, content) VALUES (?, ?)').run(kind, trimmed.slice(0, 1000))
}

export function recentChatEpisodes(limit = 20): Episode[] {
  const rows = getDb()
    .prepare("SELECT * FROM episodes WHERE kind IN ('chat_user','chat_pet') ORDER BY id DESC LIMIT ?")
    .all(limit) as unknown as Episode[]
  return rows.reverse()
}

export function unconsolidatedEpisodes(limit = 60): Episode[] {
  return getDb()
    .prepare('SELECT * FROM episodes WHERE consolidated = 0 ORDER BY id ASC LIMIT ?')
    .all(limit) as unknown as Episode[]
}

export function markConsolidated(ids: number[]): void {
  if (ids.length === 0) return
  const db = getDb()
  const stmt = db.prepare('UPDATE episodes SET consolidated = 1 WHERE id = ?')
  for (const id of ids) stmt.run(id)
}

// ------------------------------------------------------------------- kv ---

export function getKv(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setKv(key: string, value: string): void {
  getDb()
    .prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value)
}

// --------------------------------------------------------- prompt helper ---

/** Compact memory block injected into every AI call. Token-budget capped. */
export function memoryPromptBlock(): string {
  const profile = getKv('profile_summary')
  const facts = listFacts().slice(0, 25)
  const parts: string[] = []
  if (profile) parts.push(`What you know about your human so far:\n${profile.slice(0, 600)}`)
  if (facts.length > 0) {
    parts.push(`Remembered facts:\n${facts.map((f) => `- ${f.content}`).join('\n')}`)
  }
  return parts.join('\n\n')
}

// ------------------------------------------------------------------ ipc ---

export function registerMemoryIpc(): void {
  ipcMain.handle('memory:facts', () => listFacts())
  ipcMain.handle('memory:profile', () => getKv('profile_summary'))
  ipcMain.on('memory:delete-fact', (_e, id: number) => deleteFact(id))
  ipcMain.on('memory:wipe', () => wipeMemory())
  ipcMain.handle('memory:recent-chat', (_e, limit: number) =>
    recentChatEpisodes(limit).map((e) => ({
      role: e.kind === 'chat_user' ? ('user' as const) : ('assistant' as const),
      content: e.content
    }))
  )
}
