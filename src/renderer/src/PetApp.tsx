import { useEffect, useRef, useState } from 'react'
import { loadSkin, type Skin } from './pet/skin'
import { PetEngine } from './pet/engine'
import { ParticleSystem } from './pet/particles'
import { initInteractivity } from './interactivity'
import { useGame } from './hooks/useGame'
import { RadialMenu } from './ui/RadialMenu'
import { Album } from './ui/Album'
import { Toasts, RewardPopup, LevelUpBanner, Bubble, GiftBox } from './ui/Overlays'
import { ChatPanel } from './ui/ChatPanel'
import { Onboarding } from './ui/Onboarding'
import { GamesMenu } from './games/GamesMenu'
import { CatchGame } from './games/CatchGame'
import { PongGame } from './games/PongGame'
import { TttGame } from './games/TttGame'
import { levelFromXp } from './game/xp'
import { BUILTIN_SKINS, stageForLevel } from '../../shared/types'

export function skinBaseUrl(id: string): string {
  return BUILTIN_SKINS.some((s) => s.id === id) ? `./skins/${id}` : `aimi-skin://${id}`
}

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

  // load the skin the pet was wearing (fall back to default art)
  const stateLoaded = game.state !== null
  useEffect(() => {
    if (!gameRef.current.state) return
    const id = gameRef.current.state.skin || 'default'
    loadSkin(skinBaseUrl(id))
      .then(setSkin)
      .catch(() => loadSkin('./skins/default').then(setSkin).catch(console.error))
  }, [stateLoaded])

  // live skin switching from the settings window
  useEffect(() => {
    return window.aimi.pet.onSkinChanged((id) => {
      loadSkin(skinBaseUrl(id))
        .then((s) => {
          engineRef.current?.setSkin(s)
          setSkin(s)
          gameRef.current.actions.skinChanged(id)
        })
        .catch(console.error)
    })
  }, [])

  useEffect(() => {
    if (!skin || !petRef.current || !spriteRef.current || !particleRef.current) return
    if (engineRef.current) return // skin swaps go through engine.setSkin
    const particles = new ParticleSystem(particleRef.current)
    const state = gameRef.current.state
    const scale = stageForLevel(levelFromXp(state?.totalXp ?? 0)).scale
    const engine = new PetEngine(petRef.current, spriteRef.current, skin, particles, scale)
    if (state?.accessory) engine.setAccessory(state.accessory)
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
      {ui.bubble && (
        <Bubble
          bubble={ui.bubble}
          onClick={actions.openChatFromBubble}
          onApprove={actions.approveScreenshot}
          onDecline={actions.declineScreenshot}
        />
      )}
      {ui.gift && <GiftBox x={ui.gift.x} onOpen={actions.openGift} />}
      {ui.menu && state && (
        <RadialMenu
          anchor={ui.menu}
          state={state}
          onTreat={actions.feedTreat}
          onPet={actions.petPet}
          onPlay={actions.openGames}
          onTalk={actions.openChat}
          onAlbum={actions.openAlbum}
          onClose={actions.closeMenu}
        />
      )}
      {ui.chat && state && (
        <ChatPanel
          anchor={ui.chat.anchor}
          pendingScreenshot={ui.chat.screenshot}
          petName={state.petName}
          level={levelFromXp(state.totalXp)}
          streak={state.streak.count}
          engine={engineRef.current}
          onUserMessage={actions.chatMessageSent}
          onClose={actions.closeChat}
        />
      )}
      {ui.popups.length > 0 && <RewardPopup popup={ui.popups[0]} />}
      {ui.levelUp && <LevelUpBanner level={ui.levelUp.level} coins={ui.levelUp.coins} />}
      {ui.album && state && <Album state={state} onClose={actions.closeAlbum} />}
      {ui.games && state && (
        <GamesMenu
          state={state}
          onStart={actions.startGame}
          onZoomies={actions.zoomies}
          onHat={actions.setAccessory}
          onClose={actions.closeGames}
        />
      )}
      {ui.activeGame === 'catch' && skin && (
        <CatchGame skin={skin} onEnd={(s, m) => actions.finishGame('catch', s, m)} onClose={actions.closeGames} />
      )}
      {ui.activeGame === 'pong' && skin && (
        <PongGame skin={skin} onEnd={(s, m) => actions.finishGame('pong', s, m)} onClose={actions.closeGames} />
      )}
      {ui.activeGame === 'ttt' && (
        <TttGame onEnd={(s, m) => actions.finishGame('ttt', s, m)} onClose={actions.closeGames} />
      )}
      {ui.evolution && state && (
        <div className="levelup evolution">
          <div className="levelup-title">EVOLVED!</div>
          <div className="levelup-sub">
            {state.petName.toUpperCase()} IS NOW A {ui.evolution.name}!
          </div>
        </div>
      )}
      {state && !state.onboardedAt && <Onboarding onDone={actions.completeOnboarding} />}
    </div>
  )
}
