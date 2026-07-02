import { useState } from 'react'
import { Px } from './Px'
import { sfx } from '../game/sound'

export function Onboarding({ onDone }: { onDone: (name: string) => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('AiMI')

  const next = () => {
    sfx.pop()
    setStep((s) => s + 1)
  }

  return (
    <div className="onboard hit">
      {step === 0 && (
        <>
          <div className="onboard-icon">
            <Px name="egg" size={80} />
          </div>
          <div className="onboard-title">A WILD EGG APPEARED!</div>
          <p className="onboard-text">SOMETHING TINY IS ABOUT TO HATCH ON YOUR SCREEN. GIVE IT A NAME:</p>
          <input
            className="onboard-input"
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && next()}
          />
          <button className="onboard-btn" onClick={next} disabled={!name.trim()}>
            HATCH!
          </button>
        </>
      )}
      {step === 1 && (
        <>
          <div className="onboard-icon">
            <Px name="gear" size={64} />
          </div>
          <div className="onboard-title">GIVE {name.trim().toUpperCase()} A BRAIN?</div>
          <p className="onboard-text">
            PLUG IN ANY AI — ANTHROPIC, OPENAI, GOOGLE, MISTRAL... OR OLLAMA, WHICH IS FREE AND 100% LOCAL. YOUR PET
            WILL CHAT, ASK WHAT YOU'RE UP TO, AND LEARN ABOUT YOU OVER TIME.
          </p>
          <p className="onboard-text dim">NO BRAIN? NO PROBLEM — IT'S STILL A FULL VIRTUAL PET.</p>
          <div className="onboard-row">
            <button
              className="onboard-btn"
              onClick={() => {
                window.aimi.openSettings()
                next()
              }}
            >
              OPEN AI SETUP
            </button>
            <button className="onboard-btn ghost" onClick={next}>
              LATER
            </button>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <div className="onboard-icon">
            <Px name="star" size={64} />
          </div>
          <div className="onboard-title">HOW TO PLAY</div>
          <ul className="onboard-list">
            <li>
              <Px name="paw" size={16} /> CLICK YOUR PET FOR TREATS, PETS AND CHAT
            </li>
            <li>
              <Px name="heart" size={16} /> DRAG IT AROUND — IT LOVES FLYING
            </li>
            <li>
              <Px name="coin" size={16} /> EVERYTHING EARNS XP. NOTHING EVER DECAYS.
            </li>
            <li>
              <Px name="gift" size={16} /> GIFTS APPEAR SOMETIMES. OPEN THEM!
            </li>
          </ul>
          <button className="onboard-btn" onClick={() => onDone(name.trim())}>
            LET'S GO!
          </button>
        </>
      )}
      <div className="onboard-dots">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`onboard-dot${i === step ? ' active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
