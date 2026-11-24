import { useEffect, useState } from 'react'
import { uiAssets } from '../assets/uiAssets.js'
import { HistoryPanel } from './HistoryPanel.jsx'
import { TransactionsPanel } from './TransactionsPanel.jsx'
import { playSfx } from '../../../shared/audio/index.js'
import { usesCfWallet } from '../../../shared/fireball/gameMode.js'
import { useT } from '../../../shared/i18n/index.js'
import { loadTransactions } from '../state/transactionsStore.js'

/**
 * HISTORY button + expandable sheet — shared by betting MidControls and settlement.
 * Tabs: Results (Supabase podium) | My bets (RGS ledger, coins/money only).
 */
export function HistoryControl({
  open = false,
  onOpenChange,
  panelRef = null,
  landed = false,
}) {
  const t = useT()
  const showMyBets = usesCfWallet()
  const [tab, setTab] = useState('results')
  const activeTab = showMyBets ? tab : 'results'
  const shell = open
    ? uiAssets.historyMyBetsActive
    : uiAssets.historyMyBetsInactive

  useEffect(() => {
    if (!open) return
    if (activeTab === 'myBets' && showMyBets) {
      loadTransactions({ reset: true })
    }
  }, [open, activeTab, showMyBets])

  return (
    <div
      className={[
        'mid-controls__history-slot',
        open ? 'is-open' : '',
        open && showMyBets ? 'has-tabs' : '',
        open && activeTab === 'myBets' ? 'is-my-bets' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
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

      {open && showMyBets ? (
        <div className="history-tabs" role="tablist" aria-label={t('label_history')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'results'}
            className={`history-tabs__btn${activeTab === 'results' ? ' is-active' : ''}`}
            onClick={() => setTab('results')}
          >
            {t('label_race_results')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'myBets'}
            className={`history-tabs__btn${activeTab === 'myBets' ? ' is-active' : ''}`}
            onClick={() => setTab('myBets')}
          >
            {t('label_my_bets')}
          </button>
        </div>
      ) : null}

      {activeTab === 'results' ? (
        <HistoryPanel open={open} panelRef={panelRef} landed={landed} />
      ) : (
        <TransactionsPanel open={open} />
      )}
    </div>
  )
}
