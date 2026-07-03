import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../../shared/ai'
import type { Anchor } from '../hooks/useGame'
import type { PetEngine } from '../pet/engine'
import { sfx } from '../game/sound'
import { Px } from './Px'

const GREETINGS = [
  'Hi hi! What are you up to right now? :3',
  'You came to talk to me?! Best day ever. What are you doing today?',
  "Tell me everything! What's on your screen right now?"
]

const QUICK_CHIPS = ["I'm coding", 'Watching YouTube', 'Working on something big', 'Taking a break']

// survives panel close/reopen within a session; seeded from SQLite history
let sessionMessages: ChatMessage[] = []
let historyLoaded = false

/** Lets the proactive brain inject its bubble lines into the conversation. */
export function pushSessionAssistant(text: string): void {
  sessionMessages = [...sessionMessages, { role: 'assistant', content: text }]
}

interface Props {
  anchor: Anchor
  pendingScreenshot?: string
  petName: string
  level: number
  streak: number
  engine: PetEngine | null
  onUserMessage: () => void
  onClose: () => void
}

export function ChatPanel({ anchor, pendingScreenshot, petName, level, streak, engine, onUserMessage, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(sessionMessages)
  const [input, setInput] = useState('')
  const [draft, setDraft] = useState<string | null>(null) // streaming assistant text
  const [configured, setConfigured] = useState<boolean | null>(null)
  const requestRef = useRef<string | null>(null)
  const draftRef = useRef('')
  const hadImageRef = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.aimi.ai.getSettings().then((s) => setConfigured(!!s.provider && !!s.model))
  }, [])

  // seed from persistent history; greeting only for a truly fresh pet
  useEffect(() => {
    if (historyLoaded) return
    historyLoaded = true
    window.aimi.memory.recentChat(12).then((hist) => {
      if (sessionMessages.length > 0) return
      sessionMessages =
        hist.length > 0
          ? hist
          : [{ role: 'assistant' as const, content: GREETINGS[Math.floor(Math.random() * GREETINGS.length)] }]
      setMessages(sessionMessages)
    })
  }, [])

  useEffect(() => {
    const offDelta = window.aimi.ai.onDelta((id, delta) => {
      if (id !== requestRef.current) return
      draftRef.current += delta
      setDraft(draftRef.current)
    })
    const offDone = window.aimi.ai.onDone((id, error) => {
      if (id !== requestRef.current) return
      requestRef.current = null
      // finalize OUTSIDE any state updater: updaters must stay pure or
      // StrictMode's double-invoke duplicates the message
      let text = draftRef.current
      draftRef.current = ''
      if (error === 'not-configured') {
        text = "I don't have a brain yet! Open Setup and plug one in — Ollama is free! :3"
      } else if (error && hadImageRef.current) {
        text = "I tried SO hard to see it, but this model has no eyes (no vision support). Pick a vision-capable model in Setup and I'll peek! >_<"
      } else if (error) {
        text = `My brain fizzled (${error.slice(0, 80)}...). Maybe check Setup? >_<`
      }
      if (text) {
        sessionMessages = [...sessionMessages, { role: 'assistant', content: text }]
        setMessages(sessionMessages)
      }
      setDraft(null)
      engine?.playAction('happy', 0.6)
      sfx.pop()
    })
    return () => {
      offDelta()
      offDone()
    }
  }, [engine])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, draft])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    inputRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const send = (text: string, screenshot?: string): void => {
    const content = text.trim()
    if (!content || requestRef.current) return
    sessionMessages = [...sessionMessages, { role: 'user', content }]
    setMessages(sessionMessages)
    setInput('')
    onUserMessage()
    const id = crypto.randomUUID()
    requestRef.current = id
    hadImageRef.current = !!screenshot
    draftRef.current = ''
    setDraft('')
    engine?.playAction('think', 30)
    window.aimi.ai.chat(id, sessionMessages, { petName, level, streak }, screenshot)
  }

  // brain asked to peek and the user said yes — auto-send the capture
  const sentPendingRef = useRef(false)
  useEffect(() => {
    if (pendingScreenshot && !sentPendingRef.current) {
      sentPendingRef.current = true
      send('*shows you my screen*', pendingScreenshot)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScreenshot])

  const peek = async (): Promise<void> => {
    if (requestRef.current) return
    const result = await window.aimi.capture()
    if (result.ok) {
      send('*shows you my screen*', result.dataUrl)
    } else {
      sessionMessages = [
        ...sessionMessages,
        {
          role: 'assistant',
          content:
            result.reason === 'denied'
              ? 'macOS is blocking my eyes! System Settings > Privacy & Security > Screen Recording, then let me in. :3'
              : "The peek didn't work — macOS may need you to allow Screen Recording first."
        }
      ]
      setMessages(sessionMessages)
    }
  }

  const x = Math.min(window.innerWidth - 180, Math.max(180, anchor.x))

  return (
    <div className="chat hit" style={{ left: x, top: anchor.y - 12 }}>
      <div className="chat-header">
        <span className="chat-title">
          <Px name="bubble" size={18} /> {petName.toUpperCase()}
        </span>
        <button className="chat-close" onClick={onClose}>
          <Px name="xmark" size={14} />
        </button>
      </div>
      <div className="chat-list" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.content}
          </div>
        ))}
        {draft !== null && <div className="chat-msg assistant">{draft || '…'}</div>}
        {configured === false && (
          <button className="chat-setup" onClick={() => window.aimi.openSettings()}>
            <Px name="gear" size={16} /> GIVE {petName.toUpperCase()} A BRAIN
          </button>
        )}
      </div>
      {messages.length <= 1 && draft === null && (
        <div className="chat-chips">
          {QUICK_CHIPS.map((c) => (
            <button key={c} className="chip" onClick={() => send(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <button
          type="button"
          className="chat-peek"
          title={`Let ${petName} peek at your screen`}
          onClick={peek}
          disabled={draft !== null}
        >
          <Px name="camera" size={16} />
        </button>
        <input
          ref={inputRef}
          value={input}
          placeholder={`Say something to ${petName}…`}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={!input.trim() || draft !== null}>
          <Px name="send" size={16} />
        </button>
      </form>
    </div>
  )
}
