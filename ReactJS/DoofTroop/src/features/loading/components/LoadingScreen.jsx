import { BrandLogo } from './BrandLogo.jsx'
import {
  LOADING_STATUS_LABEL,
  LoadingStatus,
} from '../constants/loadingStatus.js'
import { useT } from '../../../shared/i18n/index.js'
import loadingBackground from '../../../assets/ui/LoadingScreenBackground.png'
import '../styles/loading-screen.css'

/**
 * Full-viewport branded loading / connecting screen.
 *
 * @param {{ status?: keyof typeof LoadingStatus | string, label?: string }} props
 */
export function LoadingScreen({
  status = LoadingStatus.LOADING,
  label,
}) {
  const t = useT()
  const statusKey =
    LOADING_STATUS_LABEL[status] ?? LOADING_STATUS_LABEL[LoadingStatus.LOADING]
  const text = label ?? t(statusKey)

  return (
    <div
      className="loading-screen"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-status={status}
      style={{ '--loading-bg': `url(${loadingBackground})` }}
    >
      <BrandLogo />
      <p className="loading-screen__status">{text}</p>
    </div>
  )
}
