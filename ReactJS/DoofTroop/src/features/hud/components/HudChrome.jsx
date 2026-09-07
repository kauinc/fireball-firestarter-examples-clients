import { useEffect, useId, useRef, useState } from 'react'
import { uiAssets } from '../../betting/assets/uiAssets.js'
import { playSfx } from '../../../shared/audio/index.js'
import { useDialogFocus } from '../hooks/useDialogFocus.js'

const MENU_ITEMS = Object.freeze([
  { id: 'sound', label: 'Sound', icon: uiAssets.menuIcons.sound },
  { id: 'commentary', label: 'Commentary', icon: uiAssets.menuIcons.commentary },
  { id: 'howToPlay', label: 'How to play', icon: uiAssets.menuIcons.howToPlay },
  { id: 'home', label: 'Home', icon: uiAssets.menuIcons.home },
])

/**
 * Shared fullscreen control for betting / race / settlement overlays.
 */
export function HudFullscreenButton({ isFullscreen, onToggle }) {
  return (
    <button
      type="button"
      className={`betting-overlay__fullscreen${isFullscreen ? ' is-active' : ''}`}
      aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
      aria-pressed={isFullscreen}
      onClick={() => {
        onToggle?.()
        playSfx('fullscreenToggle')
      }}
    >
      <img
        src={uiAssets.fullscreen}
        alt=""
        className="betting-overlay__fullscreen-icon"
        draggable={false}
      />
    </button>
  )
}

/**
 * Hamburger menu — placeholder panel (labels only, no item actions yet).
 */
export function HudMenuChrome({ placement = 'footer' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()

  function openMenu() {
    setOpen(true)
    playSfx('menuOpen')
  }

  function closeMenu() {
    setOpen(false)
    playSfx('menuClose')
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
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="hud-menu-panel__item"
              role="menuitem"
              onClick={closeMenu}
            >
              <img
                src={item.icon}
                alt=""
                className="hud-menu-panel__icon"
                draggable={false}
              />
              <span className="hud-menu-panel__label">{item.label}</span>
            </button>
          ))}
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
      style={{ backgroundImage: `url(${uiAssets.backgroundFade})` }}
      aria-hidden="true"
    />
  )
}
