import { powerMonitor, type BrowserWindow } from 'electron'
import { generateText } from 'ai'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { app } from 'electron'
import { buildModel } from '../ai/registry'
import { getPublicSettings, getResolvedSettings } from '../ai/settings'
import {
  addFact,
  getKv,
  markConsolidated,
  memoryPromptBlock,
  recordEpisode,
  setKv,
  unconsolidatedEpisodes
} from '../memory'

const TICK_MIN_MS = 10 * 60_000
const TICK_MAX_MS = 22 * 60_000
const IDLE_SKIP_SECONDS = 6 * 60
const CONSOLIDATE_THRESHOLD = 30

const actionSchema = z.object({
  action: z.enum(['say', 'ask_user', 'ask_screenshot', 'idle']),
  text: z.string().max(400).optional().default(''),
  learn: z.array(z.string().max(300)).max(3).optional().default([])
})

/** Frontmost app name via lsappinfo — no TCC permission needed (macOS only). */
function frontAppName(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('lsappinfo', ['front'], { timeout: 1500 }, (err, asn) => {
      if (err || !asn.trim()) return resolve(null)
      execFile('lsappinfo', ['info', '-only', 'name', asn.trim()], { timeout: 1500 }, (err2, out) => {
        if (err2) return resolve(null)
        resolve(/"?name"?\s*=\s*"([^"]+)"/.exec(out)?.[1] ?? null)
      })
    })
  })
}

function isNight(): boolean {
  const h = new Date().getHours()
  return h >= 23 || h < 7
}

function gameStateSnapshot(): { petName: string; level: number; streak: number } {
  try {
    const raw = JSON.parse(readFileSync(join(app.getPath('userData'), 'game-state.json'), 'utf-8'))
    const xp = raw.totalXp ?? 0
    let level = 1
    while (Math.round(80 * Math.pow(level, 1.5)) <= xp) level++
    return { petName: raw.petName ?? 'AiMI', level, streak: raw.streak?.count ?? 0 }
  } catch {
    return { petName: 'AiMI', level: 1, streak: 0 }
  }
}

function extractJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('no JSON object in response')
  return JSON.parse(text.slice(start, end + 1))
}

async function think(win: BrowserWindow): Promise<void> {
  const settings = getResolvedSettings()
  if (!settings) return
  if (isNight()) return
  if (powerMonitor.getSystemIdleTime() > IDLE_SKIP_SECONDS) return

  const snap = gameStateSnapshot()
  const memory = memoryPromptBlock()
  const hour = new Date().getHours()
  const prefs = getPublicSettings()
  const frontApp = prefs.shareActiveApp ? await frontAppName() : null

  const actions = prefs.allowScreenshots
    ? `"say" | "ask_user" | "ask_screenshot" | "idle"`
    : `"say" | "ask_user" | "idle"`

  const prompt = [
    `You are the inner voice of ${snap.petName}, a tiny pixel cat companion on your human's screen (level ${snap.level}${snap.streak > 1 ? `, ${snap.streak}-day streak` : ''}). Local time hour: ${hour}.`,
    frontApp ? `Your human's frontmost app right now: ${frontApp}.` : '',
    memory || 'You know almost nothing about your human yet — be curious!',
    `Decide ONE small thing to do right now. Rules: be a warm, playful hype-friend; never guilt-trip or nag; keep text under 25 words; no emoji (ASCII kaomoji like :3 are ok). If you spoke recently or have nothing good, choose idle. Asking what they're doing is great — you learn about them.${prefs.allowScreenshots ? ' ask_screenshot politely asks to peek at their screen — use it rarely, only when curious.' : ''}`,
    `Reply with ONLY a JSON object, no markdown fences:`,
    `{"action": ${actions}, "text": "what you say (empty for idle)", "learn": []}`
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const result = await generateText({
      model: buildModel(settings),
      prompt,
      abortSignal: AbortSignal.timeout(30_000)
    })
    const parsed = actionSchema.parse(extractJson(result.text))
    for (const fact of parsed.learn) addFact(fact, 'misc', 'brain')
    if (parsed.action !== 'idle' && parsed.text.trim()) {
      recordEpisode('chat_pet', parsed.text)
      win.webContents.send('brain:say', {
        text: parsed.text.trim(),
        kind: parsed.action === 'ask_screenshot' && prefs.allowScreenshots ? 'ask_screenshot' : parsed.action
      })
    }
  } catch (err) {
    console.error('brain tick failed:', err instanceof Error ? err.message : err)
  }
}

async function consolidate(): Promise<void> {
  const settings = getResolvedSettings()
  if (!settings) return
  const episodes = unconsolidatedEpisodes()
  if (episodes.length < CONSOLIDATE_THRESHOLD) return

  const prompt = [
    `You maintain the long-term memory of a desktop pet about its human. Below are recent interaction logs and the current profile.`,
    `Current profile:\n${getKv('profile_summary') ?? '(empty)'}`,
    `Recent logs:\n${episodes.map((e) => `[${e.kind}] ${e.content}`).join('\n').slice(0, 6000)}`,
    `Reply with ONLY JSON, no fences: {"profile": "updated 3-6 sentence profile of the human (name, work, hobbies, patterns, likes)", "facts": ["up to 5 NEW standalone facts worth remembering"]}`
  ].join('\n\n')

  try {
    const result = await generateText({
      model: buildModel(settings),
      prompt,
      abortSignal: AbortSignal.timeout(60_000)
    })
    const parsed = z
      .object({ profile: z.string().max(1500), facts: z.array(z.string().max(300)).max(5).default([]) })
      .parse(extractJson(result.text))
    setKv('profile_summary', parsed.profile)
    for (const fact of parsed.facts) addFact(fact, 'misc', 'consolidation', 0.8)
    markConsolidated(episodes.map((e) => e.id))
  } catch (err) {
    console.error('consolidation failed:', err instanceof Error ? err.message : err)
  }
}

export function startBrain(getWindow: () => BrowserWindow | null): void {
  const scheduleNext = (): void => {
    const delay = TICK_MIN_MS + Math.random() * (TICK_MAX_MS - TICK_MIN_MS)
    setTimeout(async () => {
      const win = getWindow()
      if (win && !win.isDestroyed() && win.isVisible()) {
        await think(win)
        await consolidate()
      }
      scheduleNext()
    }, delay)
  }
  scheduleNext()

  // dev hook: force a quick first tick
  if (process.env.AIMI_TICK_NOW) {
    setTimeout(() => {
      const win = getWindow()
      if (win) void think(win)
    }, 15_000)
  }
}
