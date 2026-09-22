import { useEffect } from 'react'
import {
  VideoTrack,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'

const VIDEO_SOURCES = [
  Track.Source.Camera,
  Track.Source.ScreenShare,
  Track.Source.Unknown,
]

/**
 * Renders the first subscribed remote video track.
 * Landscape: edge-to-edge contain. Portrait strip: cover (+ mobile zoom in CSS).
 *
 * @param {{ onVideoAvailableChange?: (available: boolean) => void }} props
 */
export function StreamViewport({ onVideoAvailableChange }) {
  const tracks = useTracks(VIDEO_SOURCES, { onlySubscribed: true })
  const videoTracks = tracks.filter(
    (trackRef) => trackRef.publication?.kind === Track.Kind.Video,
  )
  const hasVideo = videoTracks.length > 0

  useEffect(() => {
    onVideoAvailableChange?.(hasVideo)
  }, [hasVideo, onVideoAvailableChange])

  if (!hasVideo) {
    return <div className="stream-viewport stream-viewport--empty" />
  }

  const primary = videoTracks[0]

  return (
    <div className="stream-viewport">
      <VideoTrack trackRef={primary} className="stream-viewport__video" />
    </div>
  )
}
