/**
 * Podium callouts over the Unreal 3D winners: icon + place + mock time.
 * Layout: 2nd (left) · 1st (center, raised) · 3rd (right).
 */
export function SettlementPodiumLabels({
  winners = [],
  podiumRef = null,
}) {
  const byPlace = Object.fromEntries(winners.map((w) => [w.place, w]))
  const ordered = [byPlace['2nd'], byPlace['1st'], byPlace['3rd']].filter(
    Boolean,
  )

  if (ordered.length === 0) return null

  return (
    <div
      className="settlement-podium"
      aria-label="Race results"
      ref={podiumRef}
    >
      {ordered.map((winner) => (
        <div
          key={winner.place}
          className={`settlement-podium__col settlement-podium__col--${winner.place}`}
          style={{ '--podium-accent': podiumAccent(winner.color) }}
        >
          {winner.src ? (
            <img
              src={winner.src}
              alt=""
              className="settlement-podium__icon"
              data-podium-icon={winner.place}
              draggable={false}
            />
          ) : null}
          <span className="settlement-podium__place">{winner.place}</span>
          <span className="settlement-podium__time">{winner.timeLabel}</span>
        </div>
      ))}
    </div>
  )
}

function podiumAccent(color) {
  switch (color) {
    case 'Red':
      return '#ff5a5a'
    case 'Yellow':
      return '#f5d24a'
    case 'Green':
      return '#5dff7a'
    case 'Cyan':
      return '#5defff'
    case 'Blue':
      return '#5aa8ff'
    case 'Pink':
    case 'Magenta':
      return '#ff6ec7'
    default:
      return '#ffffff'
  }
}
