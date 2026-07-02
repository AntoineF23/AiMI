import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState, Rarity, StickerDef } from '../../../shared/types'
import { levelFromXp } from '../game/xp'
import { rollDrop, XP_REWARDS, TREAT_EMOJIS } from '../game/rewards'
import { sfx } from '../game/sound'
import type { PetEngine } from '../pet/engine'
import type { ParticleSystem } from '../pet/particles'

export interface Anchor {
  x: number
  y: number
}

export interface ToastItem {
  id: number
  text: string
  x: number
  y: number
}

export interface PopupItem {
  id: number
  emoji: string
  title: string
  subtitle: string
  rarity: Rarity
  isNew: boolean
}

export interface UiState {
  menu: Anchor | null
  bubble: { text: string; anchor: Anchor } | null
  toasts: ToastItem[]
  popups: PopupItem[]
  levelUp: { level: number; coins: number } | null
  album: boolean
  gift: { kind: 'daily' | 'surprise'; x: number } | null
}

const TALK_LINES = [
  "Hi! I'm AiMI! 💜",
  "Whatcha working on? I bet it's something cool!",
  "Soon I'll get a real brain and we can actually chat!",
  'I found a dust bunny behind your dock. We are friends now.',
  'You + me = dream team 🐾',
  "Don't tell anyone, but you're my favorite human.",
  'I practiced my zoomies today. Personal best!'
]

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
    gift: null
  })
  const stateRef = useRef(state)
  stateRef.current = state
  const uiRef = useRef(ui)
  uiRef.current = ui

  // load once, save on every change
  useEffect(() => {
    window.aimi.loadState().then(setState)
  }, [])
  useEffect(() => {
    if (state) window.aimi.saveState(state)
  }, [state])

  const anchor = useCallback((): Anchor => {
    const e = engineRef.current
    return e ? { x: e.centerX, y: e.y } : { x: window.innerWidth / 2, y: window.innerHeight - 100 }
  }, [engineRef])

  const pushToast = useCallback((text: string, at?: Anchor) => {
    const a = at ?? anchor()
    const item: ToastItem = { id: idCounter++, text, x: a.x, y: a.y - 20 }
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
            emoji: drop.sticker.emoji,
            title: drop.sticker.name,
            subtitle: 'New sticker for your album!',
            rarity: drop.sticker.rarity,
            isNew: true
          })
          setState({ ...s, stickers: [...s.stickers, drop.sticker.id] })
        } else if (drop.kind === 'coins' && drop.coins) {
          sfx.reward(drop.sticker ? drop.sticker.rarity : 'common')
          pushPopup({
            emoji: '🪙',
            title: `+${drop.coins} coins`,
            subtitle: drop.sticker ? `Duplicate ${drop.sticker.name} → coins!` : 'Shiny!',
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

  const onPetClicked = useCallback(() => {
    sfx.pop()
    if (uiRef.current.menu) {
      closeMenu()
      return
    }
    engineRef.current?.hold()
    setUi((u) => ({ ...u, menu: anchor(), bubble: null }))
  }, [anchor, closeMenu, engineRef])

  const feedTreat = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    closeMenu()
    const treat = TREAT_EMOJIS[Math.floor(Math.random() * TREAT_EMOJIS.length)]
    engineRef.current?.playAction('eat', 0.9)
    sfx.munch()
    pushToast(treat, anchor())
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

  const playTogether = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    closeMenu()
    engineRef.current?.celebrate()
    setTimeout(() => addXp(XP_REWARDS.play()), 400)
    handleDrop(rollDrop(s.stickers, 0.15), 1000)
    pushToast('Zoomies!! 🎉')
  }, [addXp, closeMenu, engineRef, handleDrop, pushToast])

  const talkTo = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    closeMenu()
    engineRef.current?.hold()
    engineRef.current?.playAction('wave', 1.8)
    const text = TALK_LINES[Math.floor(Math.random() * TALK_LINES.length)]
    setUi((u) => ({ ...u, bubble: { text, anchor: anchor() } }))
    setTimeout(() => addXp(XP_REWARDS.talk()), 300)
    setTimeout(() => {
      setUi((u) => ({ ...u, bubble: null }))
      engineRef.current?.release()
    }, 5200)
  }, [addXp, anchor, closeMenu, engineRef])

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
      pushToast(newStreak > 1 ? `Day ${newStreak} together! 🔥` : 'So happy to see you! 💜', a)
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
    if (!state) return
    // daily gift (and first-ever welcome)
    if (state.lastDailyGift !== dayString()) {
      const t = setTimeout(() => spawnGift('daily'), 4000)
      return () => clearTimeout(t)
    }
    return
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state === null])

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
      feedTreat,
      petPet,
      playTogether,
      talkTo,
      openAlbum,
      closeAlbum,
      openGift
    }
  }
}
