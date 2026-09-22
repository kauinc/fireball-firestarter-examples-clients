import { useEffect } from 'react'
import {
  AudioTrack,
  LiveKitRoom,
  useRoomContext,
  useTracks,
} from '@livekit/components-react'
import { LogLevel, RoomEvent, Track, setLogLevel } from 'livekit-client'
import { useAudioMuted } from '../../../shared/audio/index.js'
import { StreamViewport } from './StreamViewport.jsx'

// LiveKit logs "already connected" at info when React re-renders reconnect;
// keep warnings/errors only.
setLogLevel(LogLevel.warn)

const AUDIO_SOURCES = [
  Track.Source.Microphone,
  Track.Source.ScreenShareAudio,
  Track.Source.Unknown,
]

/**
 * @param {import('@livekit/components-react').TrackReference} trackRef
 */
function trackKey(trackRef) {
  return `${trackRef.participant.identity}:${trackRef.publication?.trackSid ?? trackRef.source}`
}

/**
 * @param {import('livekit-client').Room} room
 * @param {boolean} muted
 */
function applyRemoteAudioMute(room, muted) {
  const volume = muted ? 0 : 1
  for (const participant of room.remoteParticipants.values()) {
    for (const publication of participant.audioTrackPublications.values()) {
      const track = publication.track
      if (!track || typeof track.setVolume !== 'function') continue
      try {
        track.setVolume(volume)
      } catch {
        // Ignore tracks that reject volume changes.
      }
    }
  }

  // Belt-and-suspenders for WebAudio / element playback paths.
  if (typeof document !== 'undefined') {
    for (const el of document.querySelectorAll(
      '.stream-shell audio, .stream-shell video',
    )) {
      el.muted = muted
      try {
        el.volume = volume
      } catch {
        // Some browsers reject volume writes on remote streams.
      }
    }
  }
}

/**
 * Renders remote stream audio and follows the HUD mute toggle.
 * Custom track list so mute/volume always apply, including Unknown
 * WHIP/ingress audio sources.
 */
function StreamAudio() {
  const room = useRoomContext()
  const muted = useAudioMuted()
  const tracks = useTracks(AUDIO_SOURCES, {
    onlySubscribed: true,
    room,
  }).filter(
    (ref) =>
      !ref.participant.isLocal && ref.publication?.kind === Track.Kind.Audio,
  )

  useEffect(() => {
    function unlock() {
      room
        .startAudio()
        .then(() => applyRemoteAudioMute(room, muted))
        .catch(() => {})
    }

    unlock()
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [room, muted])

  useEffect(() => {
    const sync = () => applyRemoteAudioMute(room, muted)
    sync()
    room.on(RoomEvent.TrackSubscribed, sync)
    room.on(RoomEvent.TrackUnmuted, sync)
    room.on(RoomEvent.ParticipantConnected, sync)
    return () => {
      room.off(RoomEvent.TrackSubscribed, sync)
      room.off(RoomEvent.TrackUnmuted, sync)
      room.off(RoomEvent.ParticipantConnected, sync)
    }
  }, [room, muted])

  if (muted) return null

  return (
    <div className="stream-shell__audio" aria-hidden="true">
      {tracks.map((trackRef) => (
        <AudioTrack
          key={trackKey(trackRef)}
          trackRef={trackRef}
          volume={1}
          muted={false}
        />
      ))}
    </div>
  )
}

/**
 * Lazy-loaded LiveKit room shell (keeps livekit out of the initial chunk).
 */
export default function StreamRoom({
  session,
  onVideoAvailableChange,
  onRoomError,
  onDisconnected,
}) {
  return (
    <LiveKitRoom
      serverUrl={session.url}
      token={session.token}
      connect
      audio={false}
      video={false}
      onError={(err) => {
        const msg = err?.message || String(err)
        if (
          err?.reason === 'CLIENT_INITIATED' ||
          /client initiated disconnect/i.test(msg)
        ) {
          if (import.meta.env.DEV) {
            console.debug('[stream] LiveKit disconnect (client)', msg)
          }
          return
        }
        console.error('[stream] LiveKit error', err)
        onRoomError?.(msg)
      }}
      onDisconnected={onDisconnected}
      className="stream-shell__room"
    >
      <StreamViewport onVideoAvailableChange={onVideoAvailableChange} />
      <StreamAudio />
    </LiveKitRoom>
  )
}
