import { useEffect, useState } from 'react'

export function PetTab() {
  const [name, setName] = useState('AiMI')
  const [muted, setMutedState] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.aimi.loadState().then((s) => {
      setName(s.petName)
      setMutedState(s.muted)
    })
  }, [])

  return (
    <div className="tab-body">
      <header>
        <h1>YOUR PET</h1>
        <p>NAME IT, MUTE IT (NEVER ABANDON IT — NOT THAT IT WOULD MIND, IT LOVES YOU UNCONDITIONALLY).</p>
      </header>

      <section>
        <h2>NAME</h2>
        <div className="key-row">
          <input type="text" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} />
          <button
            className="ghost"
            disabled={!name.trim()}
            onClick={() => {
              window.aimi.pet.rename(name.trim())
              setSaved(true)
              setTimeout(() => setSaved(false), 2000)
            }}
          >
            {saved ? 'SAVED!' : 'SAVE'}
          </button>
        </div>
      </section>

      <section>
        <h2>SOUND</h2>
        <button
          className="ghost"
          onClick={() => {
            const next = !muted
            setMutedState(next)
            window.aimi.pet.setMuted(next)
          }}
        >
          {muted ? 'SOUND: OFF — TURN ON' : 'SOUND: ON — TURN OFF'}
        </button>
      </section>
    </div>
  )
}
