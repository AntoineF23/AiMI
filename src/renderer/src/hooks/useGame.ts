import { useCallback, useEffect, useRef, useState } from 'react'
import { stageForLevel, type GameState, type Rarity, type StickerDef } from '../../../shared/types'
import { levelFromXp } from '../game/xp'
import type { GameId } from '../games/GamesMenu'
import { rollDrop, XP_REWARDS, TREAT_ICONS } from '../game/rewards'
import { setMuted, sfx } from '../game/sound'
import type { PetEngine } from '../pet/engine'
import type { ParticleSystem } from '../pet/particles'
import { pushSessionAssistant } from '../ui/ChatPanel'

export interface Anchor {
  x: number
  y: number
}

export interface ToastItem {
  id: number
  text: string
  icon?: string
  x: number
  y: number
}

export interface PopupItem {
  id: number
  icon: string
  title: string
  subtitle: string
  rarity: Rarity
  isNew: boolean
}

export interface UiState {
  menu: Anchor | null
  bubble: { text: string; anchor: Anchor; kind?: 'say' | 'ask_user' | 'ask_screenshot' } | null
  toasts: ToastItem[]
  popups: PopupItem[]
  levelUp: { level: number; coins: number } | null
  album: boolean
  chat: { anchor: Anchor; screenshot?: string } | null
  gift: { kind: 'daily' | 'surprise'; x: number } | null
  games: boolean
  activeGame: GameId | null
  evolution: { name: string } | null
}

const dayString = (d = new Date()) => d.toISOString().slice(0, 10)

let idCounter = 1

export function useGame(
  engineRef: React.RefObject<PetEngine | null>,
  particlesRef: React.RefObject<ParticleSystem | null>
) {
  const [state, setState] = useState<GameState | null>(null)
  const [ui, setUi] = useState<UiState>({
    menu: null,
    bubble: null,
    toasts: [],
    popups: [],
    levelUp: null,
    album: false,
    chat: null,
    gift: null,
    games: false,
    activeGame: null,
    evolution: null
  })
  const stateRef = useRef(state)
  stateRef.current = state
  const uiRef = useRef(ui)
  uiRef.current = ui

  // load once, save on every change
  useEffect(() => {
    window.aimi.loadState().then((s) => {
      setMuted(s.muted)
      setState(s)
    })
  }, [])
  useEffect(() => {
    if (state) window.aimi.saveState(state)
  }, [state])

  const anchor = useCallback((): Anchor => {
    const e = engineRef.current
    return e ? { x: e.centerX, y: e.y } : { x: window.innerWidth / 2, y: window.innerHeight - 100 }
  }, [engineRef])

  const pushToast = useCallback((text: string, at?: Anchor, icon?: string) => {
    const a = at ?? anchor()
    const item: ToastItem = { id: idCounter++, text, icon, x: a.x, y: a.y - 20 }
    setUi((u) => ({ ...u, toasts: [...u.toasts, item] }))
    setTimeout(() => setUi((u) => ({ ...u, toasts: u.toasts.filter((t) => t.id !== item.id) })), 1400)
  }, [anchor])

  const pushPopup = useCallback((p: Omit<PopupItem, 'id'>) => {
    const item: PopupItem = { ...p, id: idCounter++ }
    setUi((u) => ({ ...u, popups: [...u.popups, item] }))
  }, [])

  // popup queue auto-advance
  useEffect(() => {
    if (ui.popups.length === 0) return
    const t = setTimeout(() => setUi((u) => ({ ...u, popups: u.popups.slice(1) })), 3400)
    return () => clearTimeout(t)
  }, [ui.popups])

  const addXp = useCallback(
    (amount: number, at?: Anchor) => {
      const s = stateRef.current
      if (!s) return
      const before = levelFromXp(s.totalXp)
      const after = levelFromXp(s.totalXp + amount)
      pushToast(`+${amount} XP`, at)
      sfx.xp()
      if (after > before) {
        const coinBonus = after * 50
        setState({ ...s, totalXp: s.totalXp + amount, coins: s.coins + coinBonus })
        setTimeout(() => {
          sfx.levelUp()
          const a = anchor()
          particlesRef.current?.emitConfetti(a.x, a.y, 90)
          engineRef.current?.celebrate()
          setUi((u) => ({ ...u, levelUp: { level: after, coins: coinBonus } }))
          setTimeout(() => setUi((u) => ({ ...u, levelUp: null })), 3200)
        }, 350)
        // evolution: the pet grows at stage boundaries
        const fromStage = stageForLevel(before)
        const toStage = stageForLevel(after)
        if (toStage.stage > fromStage.stage) {
          setTimeout(() => {
            sfx.levelUp()
            engineRef.current?.setScale(toStage.scale)
            const a = anchor()
            particlesRef.current?.emitConfetti(a.x, a.y, 140)
            particlesRef.current?.emitSparkles(a.x, a.y - 40, 20)
            setUi((u) => ({ ...u, evolution: { name: toStage.name } }))
            setTimeout(() => setUi((u) => ({ ...u, evolution: null })), 4000)
          }, 3600)
        }
      } else {
        setState({ ...s, totalXp: s.totalXp + amount })
      }
    },
    [anchor, engineRef, particlesRef, pushPopup, pushToast]
  )

  const handleDrop = useCallback(
    (drop: ReturnType<typeof rollDrop>, delay = 600) => {
      if (!drop) return
      setTimeout(() => {
        const s = stateRef.current
        if (!s) return
        if (drop.kind === 'sticker' && drop.sticker) {
          sfx.reward(drop.sticker.rarity)
          if (drop.sticker.rarity !== 'common') {
            const a = anchor()
            particlesRef.current?.emitConfetti(a.x, a.y - 30, drop.sticker.rarity === 'legendary' ? 80 : 30)
          }
          pushPopup({
            icon: drop.sticker.id,
            title: drop.sticker.name,
            subtitle: 'NEW STICKER FOR YOUR ALBUM!',
            rarity: drop.sticker.rarity,
            isNew: true
          })
          setState({ ...s, stickers: [...s.stickers, drop.sticker.id] })
        } else if (drop.kind === 'coins' && drop.coins) {
          sfx.reward(drop.sticker ? drop.sticker.rarity : 'common')
          pushPopup({
            icon: 'coin',
            title: `+${drop.coins} COINS`,
            subtitle: drop.sticker ? `DUPLICATE ${drop.sticker.name.toUpperCase()} = COINS!` : 'SHINY!',
            rarity: drop.sticker?.rarity ?? 'common',
            isNew: false
          })
          setState({ ...s, coins: s.coins + drop.coins })
        }
      }, delay)
    },
    [anchor, particlesRef, pushPopup]
  )

  // ---------------------------------------------------------------------
  // Player actions
  // ---------------------------------------------------------------------

  const closeMenu = useCallback(() => {
    setUi((u) => ({ ...u, menu: null }))
    engineRef.current?.release()
  }, [engineRef])

  /** Click-away dismissal: collapse every transient panel (not a running game). */
  const closeAllPanels = useCallback(() => {
    setUi((u) => ({ ...u, menu: null, chat: null, games: false, album: false }))
    engineRef.current?.release()
  }, [engineRef])

  const onPetClicked = useCallback(() => {
    sfx.pop()
    const u = uiRef.current
    // toggle behavior: a pet click with anything open collapses it — panels never stack
    if (u.menu || u.chat || u.games || u.album) {
      closeAllPanels()
      return
    }
    if (u.activeGame) return // don't cover a running game with the menu
    engineRef.current?.hold()
    setUi((prev) => ({ ...prev, menu: anchor(), bubble: null }))
  }, [anchor, closeAllPanels, engineRef])

  const feedTreat = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    closeMenu()
    const treat = TREAT_ICONS[Math.floor(Math.random() * TREAT_ICONS.length)]
    engineRef.current?.playAction('eat', 0.9)
    sfx.munch()
    pushToast('', anchor(), treat)
    setTimeout(() => addXp(XP_REWARDS.treat()), 500)
    handleDrop(rollDrop(s.stickers, 0.25), 1100)
  }, [addXp, anchor, closeMenu, engineRef, handleDrop, pushToast])

  const petPet = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    closeMenu()
    const a = anchor()
    engineRef.current?.playAction('happy', 0.7)
    sfx.pet()
    particlesRef.current?.emitHearts(a.x, a.y, 5)
    setTimeout(() => addXp(XP_REWARDS.pet()), 400)
    handleDrop(rollDrop(s.stickers, 0.08), 1000)
  }, [addXp, anchor, closeMenu, engineRef, handleDrop, particlesRef])

  const openGames = useCallback(() => {
    closeMenu()
    engineRef.current?.hold()
    setUi((u) => ({ ...u, games: true }))
  }, [closeMenu, engineRef])

  const closeGames = useCallback(() => {
    setUi((u) => ({ ...u, games: false, activeGame: null }))
    engineRef.current?.release()
  }, [engineRef])

  const startGame = useCallback((id: GameId) => {
    sfx.pop()
    setUi((u) => ({ ...u, games: false, activeGame: id }))
  }, [])

  const finishGame = useCallback(
    (id: GameId, score: number, max: number) => {
      const s = stateRef.current
      if (!s) return
      setUi((u) => ({ ...u, activeGame: null }))
      engineRef.current?.release()
      engineRef.current?.celebrate()
      const prevBest = s.bestScores?.[id]
      const isBest = prevBest === undefined || score > prevBest
      const ratio = Math.max(0, Math.min(1, score / max))
      const xp = 12 + Math.round(38 * ratio)
      if (isBest) {
        setState({ ...s, bestScores: { ...s.bestScores, [id]: score } })
        pushToast('NEW BEST!', anchor(), 'trophy')
        sfx.reward('rare')
      } else {
        pushToast(ratio >= 0.6 ? 'GREAT RUN!' : 'SO CLOSE!!')
      }
      setTimeout(() => addXp(xp), 600)
      handleDrop(rollDrop(s.stickers, isBest ? 0.7 : 0.3, 1.4), 1400)
    },
    [addXp, anchor, engineRef, handleDrop, pushToast]
  )

  const zoomies = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    closeGames()
    engineRef.current?.celebrate()
    setTimeout(() => addXp(XP_REWARDS.play()), 400)
    handleDrop(rollDrop(s.stickers, 0.15), 1000)
    pushToast('ZOOMIES!!')
  }, [addXp, closeGames, engineRef, handleDrop, pushToast])

  /** Called after the renderer applied a new skin (persists the choice). */
  const skinChanged = useCallback((id: string) => {
    const s = stateRef.current
    if (s && s.skin !== id) setState({ ...s, skin: id })
  }, [])

  const setAccessory = useCallback(
    (id: string | null) => {
      const s = stateRef.current
      if (!s) return
      sfx.pop()
      engineRef.current?.setAccessory(id)
      setState({ ...s, accessory: id ?? '' })
    },
    [engineRef]
  )

  const openChat = useCallback(() => {
    closeMenu()
    engineRef.current?.hold()
    engineRef.current?.playAction('wave', 1.5)
    setUi((u) => ({ ...u, chat: { anchor: anchor() } }))
  }, [anchor, closeMenu, engineRef])

  const closeChat = useCallback(() => {
    setUi((u) => ({ ...u, chat: null }))
    engineRef.current?.release()
  }, [engineRef])

  const chatMessageSent = useCallback(() => {
    addXp(XP_REWARDS.talk())
  }, [addXp])

  // settings-window relays + proactive brain bubbles
  useEffect(() => {
    const offRenamed = window.aimi.pet.onRenamed((name) => {
      const s = stateRef.current
      if (s) setState({ ...s, petName: name })
    })
    const offMuted = window.aimi.pet.onMuted((muted) => {
      setMuted(muted)
      const s = stateRef.current
      if (s) setState({ ...s, muted })
    })
    const offBrain = window.aimi.onBrainSay((text, kind) => {
      pushSessionAssistant(text)
      sfx.pop()
      engineRef.current?.hold()
      engineRef.current?.playAction(kind === 'ask_screenshot' ? 'think' : 'wave', 1.5)
      setUi((u) => ({ ...u, bubble: { text, anchor: anchor(), kind } }))
      setTimeout(() => {
        setUi((u) => (u.bubble?.text === text ? { ...u, bubble: null } : u))
        engineRef.current?.release()
      }, kind === 'ask_screenshot' ? 25000 : 15000)
    })
    return () => {
      offRenamed()
      offMuted()
      offBrain()
    }
  }, [anchor, engineRef])

  /** Clicking the pet's bubble opens the chat to answer — answering earns XP. */
  const openChatFromBubble = useCallback(() => {
    setUi((u) => ({ ...u, bubble: null, chat: { anchor: anchor() } }))
    engineRef.current?.hold()
  }, [anchor, engineRef])

  /** User said yes to a screen peek: capture and hand it to the chat. */
  const approveScreenshot = useCallback(async () => {
    setUi((u) => ({ ...u, bubble: null }))
    const result = await window.aimi.capture()
    if (result.ok) {
      sfx.pop()
      setUi((u) => ({ ...u, chat: { anchor: anchor(), screenshot: result.dataUrl } }))
      engineRef.current?.hold()
    } else {
      pushSessionAssistant(
        result.reason === 'denied'
          ? 'macOS is blocking my eyes! System Settings > Privacy > Screen Recording, then let me in. :3'
          : "Hmm, the peek didn't work. Maybe macOS needs you to allow Screen Recording first?"
      )
      setUi((u) => ({ ...u, chat: { anchor: anchor() } }))
      engineRef.current?.hold()
    }
  }, [anchor, engineRef])

  const declineScreenshot = useCallback(() => {
    setUi((u) => ({ ...u, bubble: null }))
    engineRef.current?.release()
  }, [engineRef])

  const completeOnboarding = useCallback(
    (name: string) => {
      const s = stateRef.current
      if (!s) return
      setState({ ...s, petName: name || 'AiMI', onboardedAt: new Date().toISOString() })
      sfx.levelUp()
      const a = anchor()
      particlesRef.current?.emitConfetti(a.x, a.y, 90)
      engineRef.current?.celebrate()
      pushToast(`WELCOME ${(name || 'AiMI').toUpperCase()}!`, a)
    },
    [anchor, engineRef, particlesRef, pushToast]
  )

  const openAlbum = useCallback(() => {
    closeMenu()
    setUi((u) => ({ ...u, album: true }))
  }, [closeMenu])

  const closeAlbum = useCallback(() => setUi((u) => ({ ...u, album: false })), [])

  const openGift = useCallback(() => {
    const s = stateRef.current
    const gift = uiRef.current.gift
    if (!s || !gift) return
    setUi((u) => ({ ...u, gift: null }))
    sfx.gift()
    const a = anchor()
    particlesRef.current?.emitConfetti(gift.x + 24, window.innerHeight - 60, 45)
    if (gift.kind === 'daily') {
      const today = dayString()
      const yesterday = dayString(new Date(Date.now() - 86400000))
      const newStreak = s.streak.lastDay === yesterday ? s.streak.count + 1 : 1
      const coins = 20 + newStreak * 5
      setState({
        ...s,
        coins: s.coins + coins,
        streak: { count: newStreak, lastDay: today },
        lastDailyGift: today
      })
      pushToast(newStreak > 1 ? `DAY ${newStreak} TOGETHER!` : 'SO HAPPY TO SEE YOU!', a)
      setTimeout(() => addXp(XP_REWARDS.daily(newStreak)), 500)
      handleDrop(rollDrop(s.stickers, 1, 2), 1300)
    } else {
      setTimeout(() => addXp(XP_REWARDS.gift()), 500)
      handleDrop(rollDrop(s.stickers, 1, 1.5), 1300)
    }
    engineRef.current?.celebrate()
  }, [addXp, anchor, engineRef, handleDrop, particlesRef, pushToast])

  // ---------------------------------------------------------------------
  // Gift spawning
  // ---------------------------------------------------------------------

  const spawnGift = useCallback((kind: 'daily' | 'surprise') => {
    const e = engineRef.current
    const px = e ? e.centerX : window.innerWidth / 2
    const x = Math.min(window.innerWidth - 80, Math.max(20, px + (Math.random() < 0.5 ? -170 : 170)))
    sfx.gift()
    setUi((u) => (u.gift ? u : { ...u, gift: { kind, x } }))
  }, [engineRef])

  useEffect(() => {
    if (!state || !state.onboardedAt) return
    // daily gift (and first-ever welcome)
    if (state.lastDailyGift !== dayString()) {
      const t = setTimeout(() => spawnGift('daily'), 4000)
      return () => clearTimeout(t)
    }
    return
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state === null, state?.onboardedAt])

  useEffect(() => {
    // surprise gifts: checked every minute, ~1/30 chance → avg every ~30 min
    const interval = setInterval(() => {
      if (!uiRef.current.gift && Math.random() < 1 / 30) spawnGift('surprise')
    }, 60000)
    return () => clearInterval(interval)
  }, [spawnGift])

  return {
    state,
    ui,
    actions: {
      onPetClicked,
      closeMenu,
      closeAllPanels,
      feedTreat,
      petPet,
      openGames,
      closeGames,
      startGame,
      finishGame,
      zoomies,
      setAccessory,
      skinChanged,
      openChat,
      closeChat,
      chatMessageSent,
      openChatFromBubble,
      approveScreenshot,
      declineScreenshot,
      completeOnboarding,
      openAlbum,
      closeAlbum,
      openGift
    }
  }
}
