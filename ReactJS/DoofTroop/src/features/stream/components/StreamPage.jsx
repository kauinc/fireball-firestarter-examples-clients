import { lazy, Suspense, useCallback, useState } from 'react'
import { BettingOverlay } from '../../betting/index.js'
import { uiAssets } from '../../betting/assets/uiAssets.js'
import { RaceOverlay } from '../../race/index.js'
import { SettlementOverlay } from '../../settlement/index.js'
import { LoadingScreen, LoadingStatus } from '../../loading/index.js'
import {
  HudViewportProvider,
  FullscreenHomeScreenHint,
  useHudViewportContext,
} from '../../hud/index.js'
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
 * Applies portrait/landscape shell attrs from shared HUD viewport metrics.
 * Always paints Background_Portrait under the HUD on mobile portrait —
 * independent of which round overlay is mounted.
 */
function StreamShell({ children }) {
  const { orientation, mobilePortrait, portraitVideoPx, portraitVideoFraction } =
    useHudViewportContext()

  return (
    <div
      className={`stream-shell${mobilePortrait ? ' is-mobile-portrait' : ''}`}
      data-orientation={orientation}
      style={{
        '--portrait-video-h':
          portraitVideoPx > 0
            ? `${portraitVideoPx}px`
            : `${portraitVideoFraction * 100}%`,
      }}
    >
      {orientation === 'portrait' ? (
        <div
          className="stream-shell__portrait-bg"
          style={{ backgroundImage: `url(${uiAssets.backgroundPortrait})` }}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </div>
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
      <HudViewportProvider>
        <StreamShell>
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
        </StreamShell>
      </HudViewportProvider>
    )
  }

  if (isLoading || !session) {
    return (
      <HudViewportProvider>
        <StreamShell>
          <LoadingScreen status={LoadingStatus.LOADING} />
        </StreamShell>
      </HudViewportProvider>
    )
  }

  return (
    <HudViewportProvider>
      <StreamShell>
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

        <BettingOverlay key="betting-round" />
        <RaceOverlay key="race-round" />
        <SettlementOverlay key="settlement-round" />
        <FullscreenHomeScreenHint />
      </StreamShell>
    </HudViewportProvider>
  )
}
