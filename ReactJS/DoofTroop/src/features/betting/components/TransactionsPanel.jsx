import { balanceFromRgs } from '../../../shared/fireball/client.js'
import { useT } from '../../../shared/i18n/index.js'
import { formatMoney } from '../utils/formatMoney.js'
import {
  loadTransactions,
  openReplayFromTransaction,
  useTransactions,
} from '../state/transactionsStore.js'

/**
 * RGS bet ledger inside the History sheet (My bets tab).
 */
export function TransactionsPanel({ open = false }) {
  const t = useT()
  const { transactions, loading, error, hasMore } = useTransactions()

  if (!open) return null

  return (
    <div
      className="history-sheet history-sheet--transactions"
      role="region"
      aria-label={t('label_my_bets')}
    >
      <div className="tx-panel">
        <div className="tx-panel__head" aria-hidden="true">
          <span>{t('label_time')}</span>
          <span>{t('label_stake')}</span>
          <span>{t('label_win')}</span>
        </div>

        <div className="tx-panel__list">
          {loading && transactions.length === 0 ? (
            <p className="tx-panel__status">{t('label_loading')}</p>
          ) : null}
          {error ? (
            <p className="tx-panel__status tx-panel__status--error" role="alert">
              {t('label_request_failed')}
            </p>
          ) : null}
          {!loading && !error && transactions.length === 0 ? (
            <p className="tx-panel__status">{t('label_no_bets')}</p>
          ) : null}

          {transactions.map((tx, index) => (
            <button
              key={tx.ReplayId || `tx-${index}-${tx.Start?.getTime?.() ?? 0}`}
              type="button"
              className="tx-panel__row"
              onClick={() => openReplayFromTransaction(tx)}
            >
              <span className="tx-panel__time">
                {formatTxTime(tx.Start ?? tx.End)}
              </span>
              <span className="tx-panel__stake">
                {formatMoney(balanceFromRgs(tx.Bet))}
              </span>
              <span
                className={`tx-panel__win${tx.Win > 0 ? ' is-win' : ''}`}
              >
                {formatMoney(balanceFromRgs(tx.Win))}
              </span>
            </button>
          ))}
        </div>

        {hasMore && transactions.length > 0 ? (
          <button
            type="button"
            className="tx-panel__more"
            disabled={loading}
            onClick={() => loadTransactions({ reset: false })}
          >
            {loading ? t('label_loading') : t('label_load_more')}
          </button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * @param {Date | null | undefined} date
 */
function formatTxTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—'
  try {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ')
  }
}
