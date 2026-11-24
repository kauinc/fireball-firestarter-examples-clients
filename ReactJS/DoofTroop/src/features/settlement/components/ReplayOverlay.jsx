import { SettlementBoard } from './SettlementBoard.jsx'
import { SettlementPodiumLabels } from './SettlementPodiumLabels.jsx'
import { useT } from '../../../shared/i18n/index.js'
import {
  replayNext,
  replayPrev,
  useReplay,
} from '../state/replayStore.js'
import '../../betting/styles/hud-shared.css'
import '../styles/settlement.css'
import '../styles/flights.css'
import '../styles/replay.css'

/**
 * Admin / link replay — settlement snapshot, no LiveKit.
 * All locked bets stay on the board; winners highlighted, losers dimmed.
 */
export function ReplayOverlay() {
  const t = useT()
  const {
    active,
    loading,
    error,
    view,
    hasPrev,
    hasNext,
    index,
    transactions,
  } = useReplay()

  if (!active) return null

  return (
    <div
      className="replay-overlay settlement-overlay"
      data-settle-phase="highlight"
      role="dialog"
      aria-modal="true"
      aria-label={t('label_replay')}
    >
      <div className="replay-overlay__chrome">
        <header className="replay-overlay__header">
          <h2 className="replay-overlay__title">{t('label_replay')}</h2>
          {transactions.length > 1 ? (
            <div className="replay-overlay__nav">
              <button
                type="button"
                className="replay-overlay__nav-btn"
                disabled={!hasPrev}
                onClick={replayPrev}
                aria-label={t('label_previous')}
              >
                ‹
              </button>
              <span className="replay-overlay__nav-pos">
                {index + 1} / {transactions.length}
              </span>
              <button
                type="button"
                className="replay-overlay__nav-btn"
                disabled={!hasNext}
                onClick={replayNext}
                aria-label={t('label_next')}
              >
                ›
              </button>
            </div>
          ) : null}
        </header>

        {loading ? (
          <p className="replay-overlay__status">{t('label_loading')}</p>
        ) : null}

        {error && !loading && !view ? (
          <p className="replay-overlay__status" role="alert">
            {error === 'empty_game_state'
              ? t('label_replay_no_board')
              : t('label_replay_unavailable')}
          </p>
        ) : null}

        {!loading && view ? (
          <div className="replay-overlay__body">
            <SettlementPodiumLabels winners={view.settlement?.winners ?? []} />

            <SettlementBoard
              bets={view.bets}
              didWin={view.didWin}
              displayedWin={view.totalWin}
              settleByBetId={view.settleByBetId}
              hideLostChips={false}
              showHistoryControl={false}
              portrait={false}
              showWinBarInBoard
              comboPick={view.comboPick}
              crazyComboPicks={view.crazyComboPicks}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
