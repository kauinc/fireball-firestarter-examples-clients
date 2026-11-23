import { useT } from '../../../shared/i18n/index.js'
import logoUrl from '../../../assets/brand/astudio-gaming-logo.webp'

/**
 * Centered astudio GAMING mark used on boot / connect screens.
 */
export function BrandLogo({ className = '', alt }) {
  const t = useT()
  return (
    <img
      className={['loading-screen__logo', className].filter(Boolean).join(' ')}
      src={logoUrl}
      alt={alt ?? t('label_brand_logo_alt')}
      draggable={false}
    />
  )
}
