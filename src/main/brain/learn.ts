import { generateText } from 'ai'
import { z } from 'zod'
import type { ChatMessage } from '../../shared/ai'
import { buildModel } from '../ai/registry'
import { getResolvedSettings } from '../ai/settings'
import { addFact, listFacts, replaceAllFacts } from '../memory'

const COMPACT_ABOVE = 35
const COMPACT_TARGET = 25

// lenient: small models over-produce — clean and truncate instead of failing
const factsSchema = z.object({ facts: z.array(z.string()).default([]) })

function cleanFacts(raw: string[], max: number): string[] {
  return raw
    .map((f) => f.trim())
    .filter((f) => f.length >= 4)
    .map((f) => f.slice(0, 120))
    .slice(0, max)
}

function extractJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('no JSON object in response')
  return JSON.parse(text.slice(start, end + 1))
}

let lastExtractAt = 0

/**
 * Learns from a finished chat exchange: pulls 0-3 new long-term facts about
 * the human into memory. Fire-and-forget, cheap, rate-limited so rapid-fire
 * chatting doesn't double the API bill.
 */
export async function learnFromExchange(messages: ChatMessage[], reply: string): Promise<void> {
  const settings = getResolvedSettings()
  if (!settings) return

  const lastUser = messages.filter((m) => m.role === 'user').at(-1)
  // nothing to learn from empty/roleplay-only messages (e.g. "*shows you my screen*")
  if (!lastUser || lastUser.content.trim().length < 8) return

  const now = Date.now()
  if (now - lastExtractAt < 45_000) return
  lastExtractAt = now

  const existing = listFacts()
    .slice(0, 30)
    .map((f) => `- ${f.content}`)
    .join('\n')

  const recent = messages
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Human' : 'Pet'}: ${m.content}`)
    .join('\n')

  const prompt = [
    `You maintain the long-term memory of a desktop pet about its human. Memory space is precious.`,
    `From the exchange below, extract 0-3 NEW facts about the HUMAN worth keeping for weeks (name, job, projects, hobbies, likes/dislikes, important people).`,
    `Format: ultra-compact telegraph notes, MAX 8 words each, lowercase, no subject pronoun (every fact is about the human), prefer "topic: value" style.`,
    `Good: "job: product manager" / "loves padel" / "building a desktop pet app" / "cat named miso". Bad: "Antoine works as a product manager, leading teams to design products." (too long, redundant subject)`,
    `Skip anything covered by the known facts even partially, small talk, temporary states, pet stuff. Never invent or embellish — only what the human actually said. Usually the right answer is an empty list.`,
    existing ? `Known facts:\n${existing}` : `Known facts: (none yet)`,
    `Exchange:\n${recent}\nPet: ${reply}`,
    `Reply with ONLY JSON, no markdown fences: {"facts": []}`
  ].join('\n\n')

  try {
    const result = await generateText({
      model: buildModel(settings),
      prompt,
      abortSignal: AbortSignal.timeout(30_000)
    })
    const facts = cleanFacts(factsSchema.parse(extractJson(result.text)).facts, 3)
    for (const fact of facts) addFact(fact, 'misc', 'chat', 0.75)
    if (facts.length > 0) {
      console.log(`learned ${facts.length} fact(s):`, facts)
    }
    await compactFactsIfNeeded()
  } catch (err) {
    console.error('fact extraction failed:', err instanceof Error ? err.message : err)
  }
}

/**
 * When the fact list grows past the budget, one model call rewrites it into
 * fewer, denser notes (merge related, drop trivial). Keeps memory lean forever.
 */
export async function compactFactsIfNeeded(force = false): Promise<void> {
  const settings = getResolvedSettings()
  if (!settings) return
  const facts = listFacts()
  if (!force && facts.length <= COMPACT_ABOVE) return

  const prompt = [
    `You optimize the long-term memory of a desktop pet about its human. Memory space is precious.`,
    `Rewrite the fact list below into AT MOST ${COMPACT_TARGET} notes: merge related facts, drop trivial or outdated ones, remove redundancy.`,
    `Format: ultra-compact telegraph notes, MAX 8 words each, lowercase, no subject pronoun, prefer "topic: value" (e.g. "job: product manager", "hobbies: padel, pixel art"). Keep every distinct piece of information — compress, don't forget.`,
    `Facts:\n${facts.map((f) => `- ${f.content}`).join('\n')}`,
    `Reply with ONLY JSON, no markdown fences: {"facts": []}`
  ].join('\n\n')

  try {
    const result = await generateText({
      model: buildModel(settings),
      prompt,
      abortSignal: AbortSignal.timeout(45_000)
    })
    const rewritten = cleanFacts(factsSchema.parse(extractJson(result.text)).facts, COMPACT_TARGET)
    // never nuke memory on a degenerate answer
    if (rewritten.length >= Math.min(5, facts.length)) {
      replaceAllFacts(rewritten, 'compaction')
      console.log(`memory compacted: ${facts.length} -> ${rewritten.length} facts`)
    }
  } catch (err) {
    console.error('fact compaction failed:', err instanceof Error ? err.message : err)
  }
}
