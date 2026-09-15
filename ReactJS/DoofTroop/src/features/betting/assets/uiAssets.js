import textBar from '../../../assets/ui/TableButton.png'
import comboBar from '../../../assets/ui/ComboBar.png'
import comboBarActive from '../../../assets/ui/ComboBar_Active.png'
import comboBarNoBet from '../../../assets/ui/ComboBar_NoBet.png'
import crazyComboBar from '../../../assets/ui/CrazyComboBar_ActiveBackground.png'
import crazyComboBarComplete from '../../../assets/ui/CrazyComboBar.png'
import historyBar from '../../../assets/ui/history-bar.png'
import historyMyBetsInactive from '../../../assets/ui/History_MyBets_Inactive.png'
import historyMyBetsActive from '../../../assets/ui/History_MyBets_Active.png'
import balanceBar from '../../../assets/ui/BetBalanceBar.png'
import hatsGlassesBar from '../../../assets/ui/HatsGlassesBar.png'
import hatsGlassesBarComboActive from '../../../assets/ui/HatsGlassesBar_ComboActive.png'
import ccBoard from '../../../assets/ui/cc-board.png'
import ccSelection from '../../../assets/ui/CrazyComboBar_ActiveSmall.png'
import colorPatternBar from '../../../assets/ui/TableButton_ComboActive.png'
import patternDots from '../../../assets/ui/pattern-dots.png'
import patternSolid from '../../../assets/ui/solid.png'
import patternStripes from '../../../assets/ui/stripes.png'
import colorRedBar from '../../../assets/ui/red.png'
import colorYellowBar from '../../../assets/ui/Yellow.png'
import colorGreenBar from '../../../assets/ui/green.png'
import colorCyanBar from '../../../assets/ui/cyan.png'
import colorBlueBar from '../../../assets/ui/blue.png'
import colorMagentaBar from '../../../assets/ui/magenta.png'
import hatIcon from '../../../assets/ui/Hats.png'
import glassesIcon from '../../../assets/ui/Glasses.png'
import betField from '../../../assets/ui/bet-field.png'
import roundButton from '../../../assets/ui/RoundButton.png'
import menuButton from '../../../assets/ui/MenuButton.png'
import menuPanel from '../../../assets/ui/Menu.png'
import menuSoundIcon from '../../../assets/ui/Menu_SoundIcon.png'
import menuSoundIconMute from '../../../assets/ui/Menu_SoundIcon_Mute.png'
import menuCommentIcon from '../../../assets/ui/Menu_CommentIcon.png'
import menuInfoIcon from '../../../assets/ui/Menu_InfoIcon.png'
import menuHomeIcon from '../../../assets/ui/Menu_HomeIcon.png'
import increaseBet from '../../../assets/ui/IncreaseBet.png'
import decreaseBet from '../../../assets/ui/DecreaseBet.png'
import silverChip from '../../../assets/ui/Chip_Silver.png'
import goldChip from '../../../assets/ui/Chip_Gold.png'
import bronzeChip from '../../../assets/ui/Chip_Bronze.png'
import silverChipSelected from '../../../assets/ui/Chip_Silver_Selected.png'
import goldChipSelected from '../../../assets/ui/Chip_Gold_Selected.png'
import bronzeChipSelected from '../../../assets/ui/Chip_Bronze_Selected.png'
import silverChipSimple from '../../../assets/ui/Chip_Silver_Simple.png'
import goldChipSimple from '../../../assets/ui/Chip_Gold_Simple.png'
import bronzeChipSimple from '../../../assets/ui/Chip_Bronze_Simple.png'
import comboChip from '../../../assets/ui/Chips_Combo.png'
import crazyComboChip from '../../../assets/ui/Chips_CrazyCombo.png'
import fullscreen from '../../../assets/ui/FullScreen.png'
import backgroundFade from '../../../assets/ui/Background_Fade.png'
import timerBar from '../../../assets/ui/TimerBar.png'
import timerBarYellow from '../../../assets/ui/TimerBar_Yellow.png'
import timerBarRed from '../../../assets/ui/TimerBar_Red.png'

export const uiAssets = Object.freeze({
  textBar,
  comboBar,
  comboBarActive,
  comboBarNoBet,
  crazyComboBar,
  crazyComboBarComplete,
  historyBar,
  historyMyBetsInactive,
  historyMyBetsActive,
  balanceBar,
  hatsGlassesBar,
  hatsGlassesBarComboActive,
  ccBoard,
  ccSelection,
  colorPatternBar,
  hatIcon,
  glassesIcon,
  comboBarIcons: Object.freeze({
    colors: Object.freeze({
      Red: colorRedBar,
      Yellow: colorYellowBar,
      Green: colorGreenBar,
      Cyan: colorCyanBar,
      Blue: colorBlueBar,
      Magenta: colorMagentaBar,
    }),
    patterns: Object.freeze({
      Dots: patternDots,
      Solid: patternSolid,
      Stripes: patternStripes,
    }),
    accessories: Object.freeze({
      Hats: hatIcon,
      Glasses: glassesIcon,
    }),
  }),
  betField,
  roundButton,
  menuButton,
  menuPanel,
  menuIcons: Object.freeze({
    sound: menuSoundIcon,
    soundMute: menuSoundIconMute,
    commentary: menuCommentIcon,
    howToPlay: menuInfoIcon,
    home: menuHomeIcon,
  }),
  increaseBet,
  decreaseBet,
  fullscreen,
  backgroundFade,
  timerBar,
  timerBarYellow,
  timerBarRed,
  /** Tray chips keyed by metal. */
  chips: Object.freeze({
    silver: silverChip,
    gold: goldChip,
    bronze: bronzeChip,
  }),
  chipsSelected: Object.freeze({
    silver: silverChipSelected,
    gold: goldChipSelected,
    bronze: bronzeChipSelected,
  }),
  /** Board / stack faces (flat simple metal). */
  chipsSimple: Object.freeze({
    silver: silverChipSimple,
    gold: goldChipSimple,
    bronze: bronzeChipSimple,
  }),
  /** Combo bar stacks — same art for every metal face. */
  chipsCombo: comboChip,
  chipsCrazyCombo: crazyComboChip,
})
