import { createContext, useContext } from 'react'

export const HudViewportContext = createContext(null)

export function useHudViewportContext() {
  const value = useContext(HudViewportContext)
  if (!value) {
    throw new Error('useHudViewportContext requires HudViewportProvider')
  }
  return value
}
