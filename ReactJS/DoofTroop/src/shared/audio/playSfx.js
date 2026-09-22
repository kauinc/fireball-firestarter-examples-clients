import { sfxAssets } from './sfxAssets.js'
import { isAudioMuted } from './audioMuteStore.js'
import { MASTER_VOLUME, SFX_ENABLED, sfxMap } from './sfxMap.js'

/** @type {AudioContext | null} */
let audioCtx = null
let unlocked = false

/** @type {Map<string, Promise<AudioBuffer | null>>} */
const bufferCache = new Map()

/** Same-tick dedupe (React StrictMode double-invoke). */
let dedupeFrame = -1
/** @type {Set<string>} */
let dedupeIds = new Set()

function getContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  return audioCtx
}

/**
 * Browsers block audio until a user gesture — call once on first pointer/key.
 */
export function unlockSfx() {
  if (unlocked) return
  const ctx = getContext()
  if (!ctx) return
  unlocked = true
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
}

/**
 * Install one-time listeners so the first tap/key unlocks Web Audio.
 */
export function installSfxUnlock() {
  if (typeof window === 'undefined') return
  const unlock = () => {
    unlockSfx()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

/**
 * @param {string} eventId key from `sfxMap`
 * @param {{ volume?: number }} [opts]
 */
export function playSfx(eventId, opts = {}) {
  if (!SFX_ENABLED || isAudioMuted()) return

  const entry = sfxMap[eventId]
  if (!entry || entry.sound == null) return

  const frame = Math.floor(performance.now())
  if (frame !== dedupeFrame) {
    dedupeFrame = frame
    dedupeIds = new Set()
  }
  if (dedupeIds.has(eventId)) return
  dedupeIds.add(eventId)

  const soundKey = pickSound(entry.sound)
  if (!soundKey) return

  const url = sfxAssets[soundKey]
  if (!url) {
    console.warn(`[sfx] Missing asset "${soundKey}" for event "${eventId}"`)
    return
  }

  const volume = clamp01(
    MASTER_VOLUME * (entry.volume ?? 1) * (opts.volume ?? 1),
  )
  if (volume <= 0) return

  unlockSfx()
  const ctx = getContext()
  if (!ctx) return

  void playUrl(ctx, url, volume)
}

/**
 * @param {string | string[]} sound
 * @returns {string | null}
 */
function pickSound(sound) {
  if (typeof sound === 'string') return sound
  if (!Array.isArray(sound) || sound.length === 0) return null
  const index = Math.floor(Math.random() * sound.length)
  return sound[index] ?? null
}

/**
 * @param {AudioContext} ctx
 * @param {string} url
 * @param {number} volume
 */
async function playUrl(ctx, url, volume) {
  try {
    if (ctx.state === 'suspended') await ctx.resume()
    const buffer = await loadBuffer(ctx, url)
    if (!buffer) throw new Error('decode failed')
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.value = volume
    source.connect(gain)
    gain.connect(ctx.destination)
    source.start(0)
  } catch (err) {
    try {
      const audio = new Audio(url)
      audio.volume = volume
      void audio.play()
    } catch {
      console.warn('[sfx] play failed', err)
    }
  }
}

/**
 * @param {AudioContext} ctx
 * @param {string} url
 */
function loadBuffer(ctx, url) {
  let pending = bufferCache.get(url)
  if (!pending) {
    pending = (async () => {
      try {
        const response = await fetch(url)
        const data = await response.arrayBuffer()
        return await ctx.decodeAudioData(data.slice(0))
      } catch {
        return null
      }
    })()
    bufferCache.set(url, pending)
  }
  return pending
}

function clamp01(value) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}
