/**
 * =============================================================================
 * SFX MAP — change sounds / volumes here.
 * =============================================================================
 *
 * How to edit:
 * 1. Pick an event key below (left side).
 * 2. Set `sound` to a key from `sfxAssets.js`, or an array of keys (random pick).
 * 3. Set `sound: null` to silence that event.
 * 4. Optional `volume` is 0–1, multiplied by MASTER_VOLUME.
 *
 * To use a new WAV from Interface_And_Item_Sounds:
 * 1. Copy it into `src/assets/sfx/`
 * 2. Import + register it in `sfxAssets.js`
 * 3. Reference that key here
 */

/** Global mute switch. */
export const SFX_ENABLED = true

/** Master volume (0–1) applied to every SFX. */
export const MASTER_VOLUME = 0.55

/**
 * @typedef {{ sound: string | string[] | null, volume?: number }} SfxEntry
 * @type {Record<string, SfxEntry>}
 */
export const sfxMap = {
  // --- Betting chips / footer ---
  /** Place chip on board / combo / crazy bar (click or drop). */
  chipPlace: {
    sound: ['Coins_01', 'Coins_02', 'Coins_03', 'Coins_04', 'Coins_05'],
    volume: 0.75,
  },
  /** Select chip denomination in the footer (fallback). */
  chipSelect: { sound: 'Click_03', volume: 0.55 },
  /** Select gold metal chip. */
  chipSelectGold: { sound: 'Pop_01', volume: 0.6 },
  /** Select silver metal chip. */
  chipSelectSilver: { sound: 'Pop_02', volume: 0.6 },
  /** Select bronze metal chip. */
  chipSelectBronze: { sound: 'Pop_03', volume: 0.6 },
  /** CLEAR all bets. */
  betClear: { sound: 'Musical_Click_09', volume: 0.7 },
  /** x2 double bets. */
  betDouble: { sound: 'Item_Sell_Purchase_02', volume: 0.75 },
  /** Illegal / blocked place or pick. */
  betReject: { sound: 'Error_Buzz_02', volume: 0.55 },

  // --- Combo / Crazy Combo ---
  /** Enter / exit COMBO pick mode. */
  comboToggle: { sound: 'Flick_Switch_03', volume: 0.6 },
  /** Picked a combo attribute (color / pattern / accessory). */
  comboPick: { sound: 'Flick_Switch_05', volume: 0.65 },
  /** Enter / exit Crazy Combo pick mode, or switch podium slot. */
  crazyToggle: { sound: 'Flick_Switch_03', volume: 0.6 },
  /** Assigned a doof to a Crazy Combo slot. */
  crazyPick: { sound: 'Flick_Switch_05', volume: 0.65 },
  /** All three Crazy Combo slots filled. */
  crazyComplete: { sound: 'Flick_Switch_04', volume: 0.7 },

  // --- Betting phase cues ---
  /** Betting overlay opens (PLACE YOUR BETS). */
  bettingOpen: { sound: null, volume: 0.7 },
  /** Enter BETS CLOSING (≤10s). */
  bettingClosing: { sound: null, volume: 0.65 },
  /** BETS CLOSED. */
  bettingClosed: { sound: null, volume: 0.75 },

  // --- Sheets / chrome ---
  /** History or Current Bets sheet opens. */
  sheetOpen: { sound: 'Back_Click_03', volume: 0.55 },
  /** Sheet closes. */
  sheetClose: { sound: 'Back_Click_01', volume: 0.55 },
  /** Hamburger menu opens. */
  menuOpen: { sound: 'Back_Click_03', volume: 0.55 },
  /** Hamburger menu closes. */
  menuClose: { sound: 'Back_Click_01', volume: 0.55 },
  /** Fullscreen toggle. */
  fullscreenToggle: { sound: null, volume: 0.5 },

  // --- Settlement (Later — keep current) ---
  /** Settlement overlay appears — player won. */
  settleWin: { sound: 'Special_Powerup_05', volume: 0.85 },
  /** Settlement overlay appears — player lost / no win. */
  settleLose: { sound: 'Discordant_GameOver_Musical_Short', volume: 0.7 },
  /** Winning chips start flying to TOTAL WIN. */
  settleChipFly: { sound: ['Coins_08', 'Coins_10'], volume: 0.6 },
  /** Losing chips fall away. */
  settleChipFall: { sound: 'Cartoon_Falling_02', volume: 0.55 },
  /** TOTAL WIN count-up. */
  settleCountUp: { sound: 'Bar_Filling_01', volume: 0.45 },
}
