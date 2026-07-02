export type AiProvider = 'anthropic' | 'openai' | 'google' | 'mistral' | 'ollama' | 'custom'

/** Settings as exposed to renderers — the API key never crosses the bridge. */
export interface AiSettingsPublic {
  provider: AiProvider | null
  model: string
  baseUrl: string
  hasKey: boolean
}

export interface AiSettingsUpdate {
  provider: AiProvider
  model: string
  baseUrl?: string
  /** undefined = keep existing key; '' = clear; other = set */
  apiKey?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatContext {
  petName: string
  level: number
  streak: number
}

export interface ProviderInfo {
  id: AiProvider
  label: string
  /** swatch color for the pixel provider card */
  color: string
  needsKey: boolean
  needsBaseUrl: boolean
  defaultBaseUrl?: string
  models: string[]
  hint?: string
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    label: 'ANTHROPIC',
    color: '#e8834e',
    needsKey: true,
    needsBaseUrl: false,
    models: ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-4-8'],
    hint: 'console.anthropic.com > API keys'
  },
  {
    id: 'openai',
    label: 'OPENAI',
    color: '#4ade80',
    needsKey: true,
    needsBaseUrl: false,
    models: ['gpt-5.1-mini', 'gpt-5.1', 'gpt-4o-mini'],
    hint: 'platform.openai.com > API keys'
  },
  {
    id: 'google',
    label: 'GOOGLE',
    color: '#60a5fa',
    needsKey: true,
    needsBaseUrl: false,
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    hint: 'aistudio.google.com > Get API key'
  },
  {
    id: 'mistral',
    label: 'MISTRAL',
    color: '#ffd75e',
    needsKey: true,
    needsBaseUrl: false,
    models: ['mistral-small-latest', 'mistral-large-latest'],
    hint: 'console.mistral.ai > API keys'
  },
  {
    id: 'ollama',
    label: 'OLLAMA LOCAL',
    color: '#f4f4f8',
    needsKey: false,
    needsBaseUrl: true,
    defaultBaseUrl: 'http://localhost:11434/v1',
    models: [],
    hint: 'Free and private — needs the Ollama app running'
  },
  {
    id: 'custom',
    label: 'CUSTOM URL',
    color: '#c084fc',
    needsKey: true,
    needsBaseUrl: true,
    models: [],
    hint: 'OpenRouter, LM Studio, llama.cpp, vLLM...'
  }
]
