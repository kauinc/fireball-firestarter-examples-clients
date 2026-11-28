using System;
using System.Collections;
using System.Collections.Generic;
using Fireball.Game.Client.Tools;
using UnityEngine;
using UnityEngine.UI;

namespace LuckyWheelSample
{
    public class WheelView : MonoBehaviour
    {
        [Header("Game")] 
        [SerializeField] private RectTransform _wheelRect;
        [SerializeField] private WheelSpinner _spinner;
        [SerializeField] private List<WheelSector> _sectors;
        [SerializeField] private ScalePulseAnimation _pulseAnimation;

        [Header("UI")] 
        [SerializeField] private Image _loadingImage;
        [SerializeField] private Button _spinButton;
        [SerializeField] private Button _betDecreaseButton;
        [SerializeField] private Button _betIncreaseButton;
        [SerializeField] private Text _resultText;
        [SerializeField] private Text _betText;
        [SerializeField] private Text _winText;
        [SerializeField] private Text _jackpotText;
        [SerializeField] private Text _balanceText;

        public event Action OnClickSpin;
        public event Action OnSpinStopped;
        public event Action OnClickBetDecrease;
        public event Action OnClickBetIncrease;

        private Coroutine _spinStartCoroutine;
        private Coroutine _spinStopCoroutine;

        private void Awake()
        {
            _spinButton.onClick.AddListener(() => OnClickSpin?.Invoke());
            _betDecreaseButton.onClick.AddListener(() => OnClickBetDecrease?.Invoke());
            _betIncreaseButton.onClick.AddListener(() => OnClickBetIncrease?.Invoke());
        }

        private void OnDestroy()
        {
            _spinButton.onClick.RemoveAllListeners();
            _betDecreaseButton.onClick.RemoveAllListeners();
            _betIncreaseButton.onClick.RemoveAllListeners();
        }

        public void UpdateView(WheelStatus status, string message = null)
        {
            _loadingImage.gameObject.SetActive(status == WheelStatus.Loading);
            _wheelRect.gameObject.SetActive(status > WheelStatus.Loading);
            _spinButton.gameObject.SetActive(status > WheelStatus.Loading);
            _spinButton.interactable = status >= WheelStatus.ReadyToPlay;
            _betDecreaseButton.interactable = status >= WheelStatus.ReadyToPlay;
            _betIncreaseButton.interactable = status >= WheelStatus.ReadyToPlay;
            _resultText.text = message ??
                               (status == WheelStatus.Loading ? "Loading..." :
                                   status == WheelStatus.Spinning ? "Spinning..." :
                                   status == WheelStatus.ReadyToPlay ? "Press Spin!" :
                                   status == WheelStatus.Win ? "You win!" :
                                   status == WheelStatus.Lose ? "Try again!" :
                                   string.Empty);
        }

        public void UpdateBalance(WheelGameState gameState)
        {
            SetBet(gameState.BetAmount, gameState.Currency);
            SetWin(gameState.WinAmount, gameState.Currency);
            SetBalance(gameState.Balance, gameState.Currency);
        }

        public void SetBet(long amount, string currency)
        {
            _betText.text = CurrencyHelper.FormatMoney(amount, currency);
        }

        public void SetWin(long amount, string currency)
        {
            _winText.text = CurrencyHelper.FormatMoney(amount, currency);
        }

        public void SetBalance(long amount, string currency)
        {
            _balanceText.text = CurrencyHelper.FormatMoney(amount, currency);
        }

        public void SetJackpot(long amount, string currency)
        {
            _jackpotText.text = CurrencyHelper.FormatMoney(amount, currency);
        }

        public void ShowError(string message)
        {
            _resultText.text = message;
        }

        public void StartSpin()
        {
            StopWinAnimation();

            _spinStartCoroutine = StartCoroutine(SpinStartAnimation());
        }

        private IEnumerator SpinStartAnimation()
        {
            while (_spinStopCoroutine != null)
            {
                yield return null;
            }

            _spinner.StartSpin();
            _spinStartCoroutine = null;
        }

        public void StopSpin(Symbol symbol)
        {
            _spinStopCoroutine = StartCoroutine(SpinStopAnimation(symbol));
        }

        private IEnumerator SpinStopAnimation(Symbol symbol)
        {
            while (_spinStartCoroutine != null)
            {
                yield return null;
            }

            _spinner.StopSpin(symbol);

            while (_spinner.IsSpinning)
            {
                yield return null;
            }

            _spinStopCoroutine = null;

            OnSpinStopped?.Invoke();
        }

        public void StartWin(Symbol symbol)
        {
            var winSector = _sectors.Find(s => s.Symbol == symbol);
            if (winSector == null)
                return;

            _pulseAnimation.StartAnimation(winSector.Image.transform);
        }

        private void StopWinAnimation()
        {
            _pulseAnimation.StopAnimation();
        }

        public void LoseAnimation(Symbol symbol)
        {
            var winSector = _sectors.Find(s => s.Symbol == symbol);
            if (winSector == null)
                return;

            _pulseAnimation.StartAnimation(winSector.Label.transform, 1);
        }
    }
}
