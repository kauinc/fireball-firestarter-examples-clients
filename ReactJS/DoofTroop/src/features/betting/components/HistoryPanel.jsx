import { POSITION_OPTIONS } from '../constants/doofs.js'
import { uiAssets } from '../assets/uiAssets.js'
import { useRaceHistory } from '../state/historyStore.js'
import { translatePlace, useT } from '../../../shared/i18n/index.js'

/**
 * Round history sheet (10 × 1st/2nd/3rd) over the History bar asset.
 * Reads shared history store; supports insert / shift / exit animations.
 */
export function HistoryPanel({ open, panelRef = null, landed = false }) {
  const t = useT()
  const { rows, anim } = useRaceHistory()

  if (!open) return null

  const inserting = anim.phase === 'inserting'
  const visible = rows.slice(0, 10)
  const exitingRow =
    inserting && anim.exitingId
      ? rows.find((r) => r.id === anim.exitingId)
      : null

  return (
    <div className="history-sheet">
      <div className="history-sheet__cols" aria-hidden="true">
        {POSITION_OPTIONS.map((pos) => (
          <span key={pos}>{translatePlace(t, pos)}</span>
        ))}
      </div>

      <div
        ref={panelRef}
        className={`history-panel${inserting ? ' is-inserting' : ''}${landed ? ' is-landed' : ''}`}
        role="table"
        aria-label={t('label_round_history')}
        style={{ backgroundImage: `url(${uiAssets.historyBar})` }}
      >
        <div className="history-panel__viewport">
          {visible.map((row) => (
            <HistoryRow
              key={row.id}
              row={row}
              isEntering={inserting && row.id === anim.insertingId}
              isShifting={
                inserting &&
                row.id !== anim.insertingId &&
                row.id !== anim.exitingId
              }
            />
          ))}
        </div>
        {exitingRow ? (
          <div className="history-panel__exit-slot" aria-hidden="true">
            <HistoryRow key={exitingRow.id} row={exitingRow} isExiting />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function HistoryRow({
  row,
  isEntering = false,
  isShifting = false,
  isExiting = false,
}) {
  const className = [
    'history-panel__row',
    isEntering ? 'is-entering' : '',
    isShifting ? 'is-shifting' : '',
    isExiting ? 'is-exiting' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} role="row" data-history-row={row.id}>
      {POSITION_OPTIONS.map((pos) => {
        const src = row.places?.[pos]
        return (
          <div
            key={pos}
            className="history-panel__cell"
            role="cell"
            data-history-cell={`${row.id}:${pos}`}
          >
            {src ? <img src={src} alt="" draggable={false} /> : null}
          </div>
        )
      })}
    </div>
  )
}
