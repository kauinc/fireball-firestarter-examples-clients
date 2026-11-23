import { EN } from './en.js'

const ROOT_KEY = '__doofTroopI18n'

/**
 * Keep i18n state on globalThis so lazy-loaded chunks share one store
 * (Vite can otherwise duplicate the module across chunks).
 */
function getRoot() {
  const root = globalThis
  if (!root[ROOT_KEY]) {
    root[ROOT_KEY] = {
      language: 'en',
      strings: { ...EN },
      remoteLoaded: false,
      listeners: new Set(),
    }
  }
  return root[ROOT_KEY]
}

function emit() {
  for (const listener of getRoot().listeners) listener()
}

/**
 * @param {string} key
 * @param {Record<string, string | number> | null | undefined} [vars]
 * @param {Record<string, string>} [strings]
 * @returns {string}
 */
export function formatMessage(key, vars, strings = getRoot().strings) {
  const template =
    (strings && strings[key]) || EN[key] || (typeof key === 'string' ? key : '')
  if (!vars) return template
  return String(template).replace(/\{(\w+)\}/g, (_, name) => {
    const value = vars[name]
    return value == null ? `{${name}}` : String(value)
  })
}

/**
 * Translate a key using the current catalog (EN + optional remote merge).
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 */
export function t(key, vars) {
  return formatMessage(key, vars)
}

export function getI18nLanguage() {
  return getRoot().language
}

export function getI18nStrings() {
  return getRoot().strings
}

export function isI18nRemoteLoaded() {
  return getRoot().remoteLoaded
}

/**
 * @param {string} language
 * @param {Record<string, string>} [remoteStrings]
 */
export function setI18nCatalog(language, remoteStrings) {
  const root = getRoot()
  const nextLang = String(language || 'en').trim() || 'en'
  const merged = { ...EN }
  if (remoteStrings && typeof remoteStrings === 'object') {
    for (const [key, value] of Object.entries(remoteStrings)) {
      if (typeof value === 'string' && value.length > 0) {
        merged[key] = value
      }
    }
  }
  root.language = nextLang
  root.strings = merged
  root.remoteLoaded = Boolean(remoteStrings && Object.keys(remoteStrings).length)
  emit()
}

/** Reset to EN fallback (tests / reconnect). */
export function resetI18nToEn() {
  const root = getRoot()
  root.language = 'en'
  root.strings = { ...EN }
  root.remoteLoaded = false
  emit()
}

export function subscribeI18n(listener) {
  const root = getRoot()
  root.listeners.add(listener)
  return () => root.listeners.delete(listener)
}

/** Snapshot for useSyncExternalStore — language + key count forces re-render on merge. */
export function getI18nSnapshot() {
  const root = getRoot()
  return `${root.language}:${Object.keys(root.strings).length}:${root.remoteLoaded ? 1 : 0}`
}
