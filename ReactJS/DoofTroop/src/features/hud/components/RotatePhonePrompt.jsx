import { useHudViewportContext } from '../HudViewportContext.jsx'
import turnPhoneIcon from '../../../assets/ui/TurnPhone.png'
import './rotate-phone.css'

/**
 * Portrait gate — hide game HUD and ask to rotate.
 */
export function RotatePhonePrompt() {
  return (
    <div className="rotate-phone" role="dialog" aria-modal="true" aria-labelledby="rotate-phone-title">
      <div className="rotate-phone__panel">
        <img
          className="rotate-phone__icon"
          src={turnPhoneIcon}
          alt=""
          draggable={false}
        />
        <p id="rotate-phone-title" className="rotate-phone__title">
          PLEASE ROTATE YOUR PHONE
        </p>
        <p className="rotate-phone__subtitle">TO LANDSCAPE MODE</p>
      </div>
    </div>
  )
}

/** Renders children only in landscape; portrait shows the rotate prompt. */
export function LandscapeHudOnly({ children }) {
  const { orientation } = useHudViewportContext()
  if (orientation === 'portrait') {
    return <RotatePhonePrompt />
  }
  return children
}
