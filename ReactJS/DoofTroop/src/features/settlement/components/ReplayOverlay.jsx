import { useMemo } from 'react'
import { SettlementBoard } from './SettlementBoard.jsx'
import { SettlementPodiumLabels } from './SettlementPodiumLabels.jsx'
import { replayViewFromGameState } from '../utils/replayFromGameState.js'
import {
  closeReplay,
  useTransactions,
} from '../../betting/state/transactionsStore.js'
import { formatMoney } from '../../betting/utils/formatMoney.js'
import { useT } from '../../../shared/i18n/index.js'
import { playSfx } from '../../../shared/audio/index.js'
import '../styles/replay.css'

/**
 * Read-only board + podium from an RGS replay GameState snapshot.
 */
export function ReplayOverlay() {
  const t = useT()
  const { replayOpen, replayGameState, replayLoading, replayError } =
    useTransactions()

  const view = useMemo(
    () => replayViewFromGameState(replayGameState),
    [replayGameState],
  )

  if (!replayOpen) return null

  const handleClose = () => {
    playSfx('sheetClose')
    closeReplay()
  }

  return (
    <div
      className="replay-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('label_replay')}
    >
      <button
        type="button"
        className="replay-overlay__backdrop"
        aria-label={t('label_close')}
        onClick={handleClose}
      />

      <div className="replay-overlay__chrome">
        <header className="replay-overlay__header">
          <h2 className="replay-overlay__title">{t('label_replay')}</h2>
          <button
            type="button"
            className="replay-overlay__close"
            onClick={handleClose}
          >
            {t('label_close')}
          </button>
        </header>

        {replayLoading ? (
          <p className="replay-overlay__status">{t('label_loading')}</p>
        ) : null}

        {replayError && !replayLoading ? (
          <p className="replay-overlay__status" role="alert">
            {t('label_replay_unavailable')}
          </p>
        ) : null}

        {!replayLoading && !replayError && view ? (
          <div className="replay-overlay__body">
            <SettlementPodiumLabels winners={view.settlement?.winners ?? []} />

            <div className="replay-overlay__meters" aria-hidden="true">
              <span>
                {t('label_stake')} {formatMoney(view.totalStake)}
              </span>
              <span>
                {t('label_win')} {formatMoney(view.totalWin)}
              </span>
            </div>

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
