import { generateText } from 'ai'
import { z } from 'zod'
import type { ChatMessage } from '../../shared/ai'
import { buildModel } from '../ai/registry'
import { getResolvedSettings } from '../ai/settings'
import { addFact, listFacts } from '../memory'

const factsSchema = z.object({ facts: z.array(z.string().min(4).max(300)).max(3).default([]) })

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
    `You maintain the long-term memory of a desktop pet about its human.`,
    `From the exchange below, extract 0-3 NEW short standalone facts about the HUMAN worth remembering for weeks (name, job, projects, hobbies, likes/dislikes, habits, important people). Each fact must be a complete sentence understandable on its own.`,
    `Do NOT include: things already in the known facts, small talk, one-off states ("is tired right now"), or anything about the pet itself. Only record what the human actually said — never invent, infer, or embellish details. If nothing qualifies, return an empty list.`,
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
    const parsed = factsSchema.parse(extractJson(result.text))
    for (const fact of parsed.facts) addFact(fact, 'misc', 'chat', 0.75)
    if (parsed.facts.length > 0) {
      console.log(`learned ${parsed.facts.length} fact(s):`, parsed.facts)
    }
  } catch (err) {
    console.error('fact extraction failed:', err instanceof Error ? err.message : err)
  }
}
