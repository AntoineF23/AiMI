/**
 * The pet window covers the whole work area but must never block the desktop.
 * The window is click-through by default; whenever the cursor is over an
 * element marked `.hit` (pet, menus, popups...) we flip real mouse events on.
 */
export const interactivityLock = { dragging: false }

export function initInteractivity(): () => void {
  let current = false
  const update = (e: MouseEvent): void => {
    if (interactivityLock.dragging) {
      if (!current) {
        current = true
        window.aimi.setInteractive(true)
      }
      return
    }
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const over = !!el?.closest('.hit')
    if (over !== current) {
      current = over
      window.aimi.setInteractive(over)
    }
  }
  document.addEventListener('mousemove', update)
  return () => document.removeEventListener('mousemove', update)
}
