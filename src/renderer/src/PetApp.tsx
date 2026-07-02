import { useEffect, useRef, useState } from 'react'
import { loadSkin, type Skin } from './pet/skin'
import { PetEngine } from './pet/engine'
import { ParticleSystem } from './pet/particles'
import { initInteractivity } from './interactivity'
import { useGame } from './hooks/useGame'
import { RadialMenu } from './ui/RadialMenu'
import { Album } from './ui/Album'
import { Toasts, RewardPopup, LevelUpBanner, Bubble, GiftBox } from './ui/Overlays'

export function PetApp() {
  const petRef = useRef<HTMLDivElement>(null)
  const spriteRef = useRef<HTMLCanvasElement>(null)
  const particleRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<PetEngine | null>(null)
  const particlesRef = useRef<ParticleSystem | null>(null)
  const [skin, setSkin] = useState<Skin | null>(null)

  const game = useGame(engineRef, particlesRef)
  const gameRef = useRef(game)
  gameRef.current = game

  useEffect(() => initInteractivity(), [])

  useEffect(() => {
    loadSkin().then(setSkin).catch(console.error)
  }, [])

  useEffect(() => {
    if (!skin || !petRef.current || !spriteRef.current || !particleRef.current) return
    const particles = new ParticleSystem(particleRef.current)
    const engine = new PetEngine(petRef.current, spriteRef.current, skin, particles)
    engine.onPetClicked = () => gameRef.current.actions.onPetClicked()
    engine.start()
    engineRef.current = engine
    particlesRef.current = particles
    return () => {
      engine.stop()
      engineRef.current = null
    }
  }, [skin])

  const { state, ui, actions } = game

  return (
    <div className="stage">
      <canvas ref={particleRef} className="particles" />
      {skin && (
        <div ref={petRef} className="pet hit">
          <canvas ref={spriteRef} />
        </div>
      )}
      <Toasts toasts={ui.toasts} />
      {ui.bubble && <Bubble bubble={ui.bubble} />}
      {ui.gift && <GiftBox x={ui.gift.x} onOpen={actions.openGift} />}
      {ui.menu && state && (
        <RadialMenu
          anchor={ui.menu}
          state={state}
          onTreat={actions.feedTreat}
          onPet={actions.petPet}
          onPlay={actions.playTogether}
          onTalk={actions.talkTo}
          onAlbum={actions.openAlbum}
          onClose={actions.closeMenu}
        />
      )}
      {ui.popups.length > 0 && <RewardPopup popup={ui.popups[0]} />}
      {ui.levelUp && <LevelUpBanner level={ui.levelUp.level} coins={ui.levelUp.coins} />}
      {ui.album && state && <Album state={state} onClose={actions.closeAlbum} />}
    </div>
  )
}
