import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import type { ResolvedAiSettings } from './settings'

/**
 * The single point where "model agnostic" happens: every provider resolves to
 * the same LanguageModel interface consumed by the brain and the chat.
 */
export function buildModel(s: ResolvedAiSettings): LanguageModel {
  switch (s.provider) {
    case 'anthropic':
      return createAnthropic({ apiKey: s.apiKey })(s.model)
    case 'openai':
      return createOpenAI({ apiKey: s.apiKey })(s.model)
    case 'google':
      return createGoogleGenerativeAI({ apiKey: s.apiKey })(s.model)
    case 'mistral':
      return createMistral({ apiKey: s.apiKey })(s.model)
    case 'ollama':
      return createOpenAICompatible({
        name: 'ollama',
        baseURL: s.baseUrl || 'http://localhost:11434/v1'
      })(s.model)
    case 'custom':
      return createOpenAICompatible({
        name: 'custom',
        baseURL: s.baseUrl,
        apiKey: s.apiKey || undefined
      })(s.model)
  }
}
