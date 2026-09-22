import { useEffect, useId, useRef, useState } from 'react'
import { uiAssets } from '../../betting/assets/uiAssets.js'
import { useFullscreen } from '../../betting/hooks/useFullscreen.js'
import {
  playSfx,
  toggleAudioMuted,
  useAudioMuted,
} from '../../../shared/audio/index.js'
import { useDialogFocus } from '../hooks/useDialogFocus.js'

const MENU_ITEMS = Object.freeze([
  { id: 'sound', label: 'Audio' },
  {
    id: 'fullscreen',
    label: 'Full screen',
    icon: uiAssets.fullscreen,
  },
  { id: 'commentary', label: 'Commentary', icon: uiAssets.menuIcons.commentary },
  { id: 'howToPlay', label: 'How to play', icon: uiAssets.menuIcons.howToPlay },
  { id: 'home', label: 'Home', icon: uiAssets.menuIcons.home },
])

/**
 * Hamburger menu — Audio, Full screen, and placeholder items.
 */
export function HudMenuChrome({ placement = 'footer' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()
  const audioMuted = useAudioMuted()
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  function openMenu() {
    setOpen(true)
    playSfx('menuOpen')
  }

  function closeMenu() {
    setOpen(false)
    playSfx('menuClose')
  }

  function handleItemClick(itemId) {
    if (itemId === 'sound') {
      const nowMuted = toggleAudioMuted()
      if (!nowMuted) playSfx('menuOpen')
      return
    }
    if (itemId === 'fullscreen') {
      // pointerdown + sync call — keeps user activation on mobile.
      toggleFullscreen()
      playSfx('fullscreenToggle')
      closeMenu()
      return
    }
    // Keep the panel open after item presses; close via hamburger / outside / Escape.
  }

  useDialogFocus({
    open,
    onClose: closeMenu,
    containerRef: rootRef,
  })

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        closeMenu()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const isTop = placement === 'top'
  const wrapClass = isTop
    ? 'betting-overlay__menu-top'
    : 'betting-footer__menu-wrap'
  const buttonClass = isTop
    ? 'betting-overlay__menu-top-btn'
    : 'betting-footer__menu'

  return (
    <div
      ref={rootRef}
      className={`${wrapClass}${open ? ' is-open' : ''}`}
    >
      {open ? (
        <div
          className="hud-menu-panel"
          id={menuId}
          role="menu"
          aria-label="Game menu"
          style={{ backgroundImage: `url(${uiAssets.menuPanel})` }}
        >
          {MENU_ITEMS.map((item) => {
            const icon =
              item.id === 'sound'
                ? audioMuted
                  ? uiAssets.menuIcons.soundMute
                  : uiAssets.menuIcons.sound
                : item.icon
            const pressed =
              item.id === 'sound'
                ? !audioMuted
                : item.id === 'fullscreen'
                  ? isFullscreen
                  : undefined
            const label =
              item.id === 'fullscreen'
                ? isFullscreen
                  ? 'Exit full screen'
                  : 'Full screen'
                : item.label
            return (
              <button
                key={item.id}
                type="button"
                className="hud-menu-panel__item"
                role="menuitem"
                aria-pressed={pressed}
                aria-label={
                  item.id === 'sound'
                    ? audioMuted
                      ? 'Unmute audio'
                      : 'Mute audio'
                    : label
                }
                onPointerDown={(event) => {
                  if (item.id !== 'fullscreen') return
                  // Fire FS on pointerdown so the gesture is still active.
                  event.preventDefault()
                  handleItemClick(item.id)
                }}
                onClick={() => {
                  if (item.id === 'fullscreen') return
                  handleItemClick(item.id)
                }}
              >
                <img
                  src={icon}
                  alt=""
                  className={`hud-menu-panel__icon${
                    item.id === 'fullscreen' ? ' hud-menu-panel__icon--wide' : ''
                  }`}
                  draggable={false}
                />
                <span className="hud-menu-panel__label">{label}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <button
        type="button"
        className={buttonClass}
        style={{ backgroundImage: `url(${uiAssets.menuButton})` }}
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (open) closeMenu()
          else openMenu()
        }}
      />
    </div>
  )
}

export function HudFade() {
  return (
    <div
      className="betting-overlay__fade"
      style={{
        backgroundImage: `url(${uiAssets.backgroundFade})`,
      }}
      aria-hidden="true"
    />
  )
}
