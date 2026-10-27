import { useHudViewport } from './hooks/useHudScale.js'
import { HudViewportContext } from './hudViewportContextValue.js'

/**
 * One viewport scale/layout for betting, race, and settlement overlays.
 */
export function HudViewportProvider({ children }) {
  const viewport = useHudViewport()
  return (
    <HudViewportContext.Provider value={viewport}>
      {children}
    </HudViewportContext.Provider>
  )
}
