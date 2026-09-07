import { lazy, Suspense, useCallback, useState } from 'react'
import { BettingOverlay } from '../../betting/index.js'
import { RaceOverlay } from '../../race/index.js'
import { SettlementOverlay } from '../../settlement/index.js'
import { LoadingScreen, LoadingStatus } from '../../loading/index.js'
import { HudViewportProvider, LandscapeHudOnly } from '../../hud/index.js'
import { useCurrentRound } from '../../betting/hooks/useCurrentRound.js'
import { RoundState } from '../../../domain/round/index.js'
import { useViewerSession } from '../hooks/useViewerSession.js'
import '../styles/stream.css'

const StreamRoom = lazy(() => import('./StreamRoom.jsx'))

function isCancelledStatus(status) {
  return (
    status === RoundState.ROUND_CANCELLED_OPERATOR ||
    status === RoundState.ROUND_CANCELLED_RUNTIME
  )
}

/**
 * Full-viewport LiveKit viewer for the Doof Troop WHIP ingress room.
 * Loading/CONNECTING are local boot UI. Overlays follow Supabase `rounds.status` (Realtime).
 */
export function StreamPage() {
  const { session, error: sessionError, isLoading, reload } = useViewerSession()
  const {
    error: roundsError,
    realtimeStatus,
    status: roundStatus,
    ready: roundsReady,
  } = useCurrentRound()
  const [roomError, setRoomError] = useState(null)
  const [hasVideo, setHasVideo] = useState(false)
  const error = roomError || sessionError

  const handleVideoAvailableChange = useCallback((available) => {
    setHasVideo(available)
  }, [])

  const handleRoomError = useCallback((msg) => {
    setHasVideo(false)
    setRoomError(msg)
  }, [])

  const handleDisconnected = useCallback(() => {
    setHasVideo(false)
  }, [])

  const roundsIssue =
    roundsError ||
    (roundsReady &&
      (realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT')
      ? `Realtime ${realtimeStatus}`
      : null)

  if (error) {
    return (
      <div className="stream-shell">
        <LoadingScreen status={LoadingStatus.LOADING} label="TAP TO RETRY..." />
        <button
          type="button"
          className="stream-shell__retry"
          aria-label="Retry connection"
          title={error}
          onClick={() => {
            setRoomError(null)
            setHasVideo(false)
            reload()
          }}
        />
      </div>
    )
  }

  if (isLoading || !session) {
    return (
      <div className="stream-shell">
        <LoadingScreen status={LoadingStatus.LOADING} />
      </div>
    )
  }

  return (
    <div className="stream-shell">
      {!hasVideo && <LoadingScreen status={LoadingStatus.CONNECTING} />}

      {roundsIssue ? (
        <div className="stream-shell__banner" role="status">
          Round feed unavailable. Reconnecting…
        </div>
      ) : null}

      {isCancelledStatus(roundStatus) ? (
        <div className="stream-shell__banner stream-shell__banner--warn" role="status">
          Round cancelled
        </div>
      ) : null}

      <Suspense fallback={<LoadingScreen status={LoadingStatus.CONNECTING} />}>
        <StreamRoom
          session={session}
          onVideoAvailableChange={handleVideoAvailableChange}
          onRoomError={handleRoomError}
          onDisconnected={handleDisconnected}
        />
      </Suspense>

      <HudViewportProvider>
        <LandscapeHudOnly>
          <BettingOverlay key="betting-round" />
          <RaceOverlay key="race-round" />
          <SettlementOverlay key="settlement-round" />
        </LandscapeHudOnly>
      </HudViewportProvider>
    </div>
  )
}
