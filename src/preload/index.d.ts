import type { AimiApi } from './index'

declare global {
  interface Window {
    aimi: AimiApi
  }
}

export {}
