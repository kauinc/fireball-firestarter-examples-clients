import { uiAssets } from '../assets/uiAssets.js'
import { HistoryPanel } from './HistoryPanel.jsx'
import { playSfx } from '../../../shared/audio/index.js'
import { useT } from '../../../shared/i18n/index.js'

/**
 * HISTORY button + expandable sheet — shared by betting MidControls and settlement.
 * Arrow is baked into History_MyBets_Inactive / Active assets.
 * Podium Results only (Supabase). RGS bet ledger is not shown in-game (Ares-style).
 */
export function HistoryControl({
  open = false,
  onOpenChange,
  panelRef = null,
  landed = false,
}) {
  const t = useT()
  const shell = open
    ? uiAssets.historyMyBetsActive
    : uiAssets.historyMyBetsInactive

  return (
    <div className={`mid-controls__history-slot${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className={`mid-controls__history${open ? ' is-open' : ''}`}
        style={{ backgroundImage: `url(${shell})` }}
        aria-expanded={open}
        aria-label={t('label_history')}
        onClick={() => {
          const next = !open
          onOpenChange?.(next)
          playSfx(next ? 'sheetOpen' : 'sheetClose')
        }}
      >
        {t('label_history')}
      </button>
      <HistoryPanel open={open} panelRef={panelRef} landed={landed} />
    </div>
  )
}
