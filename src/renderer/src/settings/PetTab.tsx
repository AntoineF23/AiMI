import { useEffect, useState } from 'react'
import { BUILTIN_SKINS } from '../../../shared/types'

export function PetTab() {
  const [name, setName] = useState('AiMI')
  const [muted, setMutedState] = useState(false)
  const [saved, setSaved] = useState(false)
  const [allowScreenshots, setAllowScreenshots] = useState(true)
  const [shareActiveApp, setShareActiveApp] = useState(false)
  const [skin, setSkin] = useState('default')
  const [userSkins, setUserSkins] = useState<{ id: string; label: string }[]>([])

  useEffect(() => {
    window.aimi.loadState().then((s) => {
      setName(s.petName)
      setMutedState(s.muted)
      setSkin(s.skin || 'default')
    })
    window.aimi.ai.getSettings().then((s) => {
      setAllowScreenshots(s.allowScreenshots)
      setShareActiveApp(s.shareActiveApp)
    })
    window.aimi.skins.list().then(setUserSkins)
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
        <h2>SKIN</h2>
        <div className="model-chips">
          {[...BUILTIN_SKINS, ...userSkins].map((s) => (
            <button
              key={s.id}
              className={`chip${skin === s.id ? ' active' : ''}`}
              onClick={() => {
                setSkin(s.id)
                window.aimi.pet.setSkin(s.id)
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="hint">
          ADD YOUR OWN: DROP A SKIN FOLDER (SKIN.JSON + PNGS) INTO THE APP'S "SKINS" FOLDER — SEE THE SKIN GUIDE ON
          GITHUB.
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

      <section>
        <h2>PRIVACY</h2>
        <div className="privacy-rows">
          <button
            className="ghost"
            onClick={() => {
              const next = !allowScreenshots
              setAllowScreenshots(next)
              window.aimi.ai.setPrefs({ allowScreenshots: next })
            }}
          >
            {allowScreenshots ? 'SCREEN PEEKS: ALLOWED (ALWAYS ASKS FIRST)' : 'SCREEN PEEKS: DISABLED'}
          </button>
          <button
            className="ghost"
            onClick={() => {
              const next = !shareActiveApp
              setShareActiveApp(next)
              window.aimi.ai.setPrefs({ shareActiveApp: next })
            }}
          >
            {shareActiveApp ? 'SHARE ACTIVE APP NAME: ON' : 'SHARE ACTIVE APP NAME: OFF'}
          </button>
        </div>
        <div className="hint">
          PEEKS SEND ONE SCREENSHOT TO YOUR AI PROVIDER, ONLY WHEN YOU SAY YES, AND ARE NEVER SAVED. ACTIVE APP
          SHARING LETS YOUR PET KNOW WHICH APP IS IN FRONT SO IT CAN CHEER YOU ON.
        </div>
      </section>
    </div>
  )
}
