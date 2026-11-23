import { setI18nCatalog } from './i18nStore.js'

/**
 * Seed EN, then optionally fetch a remote pack from Fireball Translation API
 * via the SDK module and merge on top.
 *
 * Failures keep the EN fallback — UI never blocks on CMS.
 *
 * @param {{
 *   fireball: { session?: { gameId?: string, language?: string }, translation?: { getTranslation: Function } },
 *   gameId?: string,
 *   language?: string,
 *   forceRemote?: boolean,
 * }} args
 */
export async function loadTranslations({
  fireball,
  gameId,
  language,
  forceRemote = true,
} = {}) {
  const session = fireball?.session
  const resolvedGameId = String(
    gameId || session?.gameId || '',
  ).trim()
  const resolvedLang = String(
    language || session?.language || 'en',
  )
    .trim()
    .toLowerCase() || 'en'

  // Always start from EN so first paint is correct.
  setI18nCatalog(resolvedLang, null)

  if (!resolvedGameId || !fireball?.translation?.getTranslation) {
    return { language: resolvedLang, remote: false }
  }

  // Always fetch for CMS freshness unless caller opts out for en-only smoke.
  if (!forceRemote && resolvedLang === 'en') {
    return { language: resolvedLang, remote: false }
  }

  try {
    const pack = await fireball.translation.getTranslation(
      resolvedGameId,
      resolvedLang,
    )
    const remote = pack?.translation && typeof pack.translation === 'object'
      ? pack.translation
      : null
    setI18nCatalog(resolvedLang, remote)
    return {
      language: resolvedLang,
      remote: Boolean(remote && Object.keys(remote).length),
    }
  } catch (err) {
    console.warn(
      '[DoofTroop i18n] remote translations failed; keeping EN fallback',
      err?.message || err,
    )
    setI18nCatalog(resolvedLang, null)
    return { language: resolvedLang, remote: false, error: err }
  }
}
