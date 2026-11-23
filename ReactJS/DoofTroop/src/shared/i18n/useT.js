import { useCallback, useSyncExternalStore } from 'react'
import {
  getI18nSnapshot,
  subscribeI18n,
  t as translate,
} from './i18nStore.js'

/**
 * React hook: returns `t(key, vars?)` that re-renders when the catalog merges.
 * @returns {(key: string, vars?: Record<string, string | number>) => string}
 */
export function useT() {
  useSyncExternalStore(subscribeI18n, getI18nSnapshot, () => 'en:0:0')
  return useCallback((key, vars) => translate(key, vars), [])
}
