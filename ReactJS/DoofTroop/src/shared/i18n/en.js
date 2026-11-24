/**
 * English UI catalog — source of truth for DoofTroop strings and for
 * seeding Fireball Admin Translations (Translation App UUID, not gameId).
 *
 * Keys follow Bonbonella / Fireball `label_*` convention.
 */
export const EN = Object.freeze({
  // Loading / boot
  label_loading: 'LOADING...',
  label_connecting_stream: 'CONNECTING TO STREAM...',
  label_connecting_rgs: 'CONNECTING TO RGS...',
  label_tap_to_retry: 'TAP TO RETRY...',
  label_retry_connection: 'Retry connection',
  label_round_feed_unavailable: 'Round feed unavailable. Reconnecting...',
  label_round_cancelled: 'Round cancelled',
  label_brand_logo_alt: 'AStudio GAMING',

  // Betting banners
  label_place_your_bets: 'PLACE YOUR BETS',
  label_bets_closing: 'BETS CLOSING',
  label_bets_closed: 'BETS CLOSED',

  // Meters
  label_balance: 'BALANCE:',
  label_total_bet: 'TOTAL BET:',
  label_potential_win: 'POTENTIAL WIN:',
  label_total_win: 'TOTAL WIN:',

  // Board / chips / stakes
  label_max: 'MAX',
  label_min: 'MIN',
  label_clear: 'CLEAR',
  label_pick: 'PICK',
  label_bets: 'BETS',
  label_clear_bets: 'CLEAR BETS',
  label_repeat: 'REPEAT',
  label_last: 'LAST',
  label_double: 'x2',
  label_chips: 'Chips',
  label_change_stake: 'Change stake',
  label_increase_stake: 'Increase stake',
  label_decrease_stake: 'Decrease stake',
  label_betting_board: 'Betting board',
  label_doof_cell: '{color} {pattern}',

  // Combos
  label_combo: 'COMBO',
  label_crazy: 'CRAZY',
  label_crazy_combo: 'Crazy Combo',
  label_pays: 'PAYS',
  label_clear_combo: 'Clear combo selection',
  label_pick_combo: 'Pick combo',
  label_clear_crazy_combo: 'Clear crazy combo selection',
  label_pick_crazy_combo: 'Pick crazy combo',
  label_combo_payouts: 'Combo payouts',
  label_combo_places_compact: '1·2·3',
  label_and_3rd: '& 3rd:',

  // Places / categories
  label_place_1st: '1st',
  label_place_2nd: '2nd',
  label_place_3rd: '3rd',
  label_top_2: 'TOP 2',
  label_winner: 'WINNER',
  label_top_3: 'TOP 3',
  label_hats: 'Hats',
  label_glasses: 'Glasses',
  label_accessory_bets: 'Accessory bets',
  label_color_red: 'Red',
  label_color_yellow: 'Yellow',
  label_color_green: 'Green',
  label_color_cyan: 'Cyan',
  label_color_blue: 'Blue',
  label_color_pink: 'Pink',
  label_pattern_dots: 'Dots',
  label_pattern_solid: 'Solid',
  label_pattern_stripes: 'Stripes',

  // Race / settlement / history
  label_current_bets: 'CURRENT BETS',
  label_close_current_bets: 'Close current bets',
  label_history: 'HISTORY',
  label_round_history: 'Round history',
  label_race_results: 'Race results',
  label_replay: 'Replay',
  label_replay_unavailable: 'Replay unavailable',
  label_replay_no_board:
    'Replay loaded but board snapshot is missing. Redeploy CF with SaveGameStateForReplay and settle a new round.',
  label_previous: 'Previous',
  label_next: 'Next',
  label_close: 'Close',

  // HUD menu
  label_audio: 'Audio',
  label_fullscreen: 'Full screen',
  label_exit_fullscreen: 'Exit full screen',
  label_commentary: 'Commentary',
  label_how_to_play: 'How to play',
  label_howto_place_bets:
    'Place chips on Doofs, places, colors, patterns, or accessories during betting.',
  label_howto_metals:
    'Gold, silver, and bronze chips cover different podium places and pay different odds.',
  label_howto_combo:
    'Combo and Crazy Combo need picks first, then a stake on the combo bar.',
  label_game_paused: 'Game paused',
  label_home: 'Home',
  label_game_menu: 'Game menu',
  label_open_menu: 'Open menu',
  label_mute_audio: 'Mute audio',
  label_unmute_audio: 'Unmute audio',
  label_fullscreen_iphone_title: 'Full screen on iPhone',
  label_fullscreen_iphone_body:
    'On iPhone, full screen only works from the Home Screen icon. Open the game URL that ends with index.html, then Share → Add to Home Screen. Delete any old icon that showed an error first.',
  label_got_it: 'Got it',

  // Errors (user-visible)
  label_request_failed: 'Request failed',
  label_action_error: 'Something went wrong',
  label_fireball_connection_failed: 'Fireball connection failed',
  label_something_went_wrong: 'Something went wrong. Reload the page to continue.',
  label_reload: 'Reload page',
  label_unknown_error: 'Unknown error',
})

/** @typedef {keyof typeof EN} I18nKey */
