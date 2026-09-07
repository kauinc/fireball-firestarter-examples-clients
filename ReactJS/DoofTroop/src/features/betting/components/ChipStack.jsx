import { uiAssets } from '../assets/uiAssets.js'
import { getBetTotal } from '../utils/chipMath.js'

function formatChipTotal(value) {
  if (Number.isInteger(value)) return String(value)
  return String(value)
}

function chipSrc(metal) {
  return uiAssets.chipsSimple?.[metal] ?? uiAssets.chips[metal]
}

/**
 * Triangle fan offsets (unit space). Hover scales these up via --chip-fan.
 * bronze back-left · silver down-right · gold up-right  (рис 2)
 */
const CHIP_TRIANGLE = Object.freeze([
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 1, y: 0.8 }),
  Object.freeze({ x: 1.25, y: -0.25 }),
])

/**
 * Metal stack: at most one silver / gold / bronze face.
 * Collapsed: tight pile, total on the top chip.
 * Hover: chips fan into a triangle; each shows its stake.
 */
export function ChipStack({ chips, className = '' }) {
  if (!chips?.length) return null

  const total = getBetTotal({ chips })
  const layers = chips.slice(0, 3)

  return (
    <span
      className={`chip-stack ${className}`.trim()}
      title={formatChipTotal(total)}
    >
      {layers.map((chip, index) => {
        const src = chipSrc(chip.metal)
        const isTop = index === layers.length - 1
        const own = chip.value * (chip.count ?? 1)
        const tri = CHIP_TRIANGLE[index] ?? CHIP_TRIANGLE[0]
        return (
          <span
            key={`${chip.metal}-${index}`}
            className={`chip-stack__chip${isTop ? ' is-top' : ''}`}
            style={{
              zIndex: index + 1,
              '--chip-tx': tri.x,
              '--chip-ty': tri.y,
            }}
          >
            {src ? <img src={src} alt="" draggable={false} /> : null}
            <span className="chip-stack__amount chip-stack__amount--own">
              {formatChipTotal(own)}
            </span>
            {isTop ? (
              <span className="chip-stack__amount chip-stack__amount--total">
                {formatChipTotal(total)}
              </span>
            ) : null}
          </span>
        )
      })}
    </span>
  )
}
