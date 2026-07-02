import { useCallback, useEffect, useState } from 'react'

interface FactRow {
  id: number
  content: string
  category: string
  source: string
  created_at: string
}

export function MemoryTab() {
  const [facts, setFacts] = useState<FactRow[]>([])
  const [profile, setProfile] = useState<string | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)

  const refresh = useCallback(() => {
    window.aimi.memory.facts().then(setFacts)
    window.aimi.memory.profile().then(setProfile)
  }, [])

  useEffect(refresh, [refresh])

  return (
    <div className="tab-body">
      <header>
        <h1>WHAT AIMI KNOWS</h1>
        <p>
          EVERYTHING YOUR PET HAS LEARNED ABOUT YOU LIVES IN A LOCAL DATABASE ON THIS MAC. DELETE ANYTHING, ANYTIME.
        </p>
      </header>

      <section>
        <h2>PROFILE</h2>
        <div className="memory-profile">{profile || 'NOTHING YET — CHAT WITH YOUR PET AND IT WILL START LEARNING!'}</div>
      </section>

      <section>
        <h2>FACTS ({facts.length})</h2>
        <div className="memory-list">
          {facts.length === 0 && <div className="memory-empty">NO FACTS YET</div>}
          {facts.map((f) => (
            <div key={f.id} className="memory-fact">
              <span className="memory-fact-text">{f.content}</span>
              <button
                className="memory-del"
                title="Forget this"
                onClick={() => {
                  window.aimi.memory.deleteFact(f.id)
                  setTimeout(refresh, 100)
                }}
              >
                X
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="actions">
        {confirmWipe ? (
          <>
            <button className="ghost" onClick={() => setConfirmWipe(false)}>
              KEEP MEMORIES
            </button>
            <button
              className="danger"
              onClick={() => {
                window.aimi.memory.wipe()
                setConfirmWipe(false)
                setTimeout(refresh, 100)
              }}
            >
              YES, FORGET EVERYTHING
            </button>
          </>
        ) : (
          <button className="ghost" onClick={() => setConfirmWipe(true)}>
            WIPE ALL MEMORY
          </button>
        )}
      </section>
    </div>
  )
}
