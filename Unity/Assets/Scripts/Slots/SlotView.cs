using System;
using System.Linq;
using System.Collections;
using Fireball.Game.Client.Tools;
using UnityEngine;
using UnityEngine.UI;
using Random = UnityEngine.Random;

namespace SlotsSample
{
    public class SlotView : MonoBehaviour
    {
        [Header("Game")] 
        [SerializeField] private RectTransform _slots;
        [SerializeField] private ReelView[] _reels;

        [Header("UI")] 
        [SerializeField] private Image _loadingImage;
        [SerializeField] private Button _spinButton;
        [SerializeField] private Button _betDecreaseButton;
        [SerializeField] private Button _betIncreaseButton;
        [SerializeField] private Text _resultText;
        [SerializeField] private Text _betText;
        [SerializeField] private Text _winText;
        [SerializeField] private Text _balanceText;

        [Header("Settings")] 
        [SerializeField] private float _spinDuration = 1f;
        [SerializeField] private float _delay = 0.1f;

        public int ReelsCount => _reels.Length;

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

        public void UpdateView(SlotStatus status, string message = null)
        {
            _loadingImage.gameObject.SetActive(status == SlotStatus.Loading);
            _slots.gameObject.SetActive(status > SlotStatus.Loading);
            _spinButton.gameObject.SetActive(status > SlotStatus.Loading);
            _spinButton.interactable = status >= SlotStatus.ReadyToPlay;
            _betDecreaseButton.interactable = status >= SlotStatus.ReadyToPlay;
            _betIncreaseButton.interactable = status >= SlotStatus.ReadyToPlay;
            _resultText.text = message ??
                               (status == SlotStatus.Loading ? "Loading..." :
                                   status == SlotStatus.Spinning ? "Spinning..." :
                                   status == SlotStatus.ReadyToPlay ? "Press Spin!" :
                                   status == SlotStatus.Win ? "You win!" :
                                   status == SlotStatus.Lose ? "Try again!" :
                                   string.Empty);
        }

        public void UpdateBalance(SlotsGameState gameState)
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
            
            for (int i = 0; i < _reels.Length; i++)
            {
                _reels[i].StartSpin();

                if (i < _reels.Length - 1)
                    yield return new WaitForSeconds(_delay);
            }

            _spinStartCoroutine = null;
        }

        public void StopSpin(Symbol[] symbols)
        {
            _spinStopCoroutine = StartCoroutine(SpinStopAnimation(symbols));
        }

        private IEnumerator SpinStopAnimation(Symbol[] results)
        {
            while (_spinStartCoroutine != null)
            {
                yield return null;
            }
            
            for (int i = 0; i < _reels.Length; i++)
            {
                _reels[i].StopAt(results[i]);

                if (i < _reels.Length - 1)
                    yield return new WaitForSeconds(_delay);
            }
            
            while (IsSpinning())
            {
                yield return null;
            }

            _spinStopCoroutine = null;
            
            OnSpinStopped?.Invoke();
        }

        public void StartWin(Symbol winSymbol)
        {
            var winReels = _reels.Where(r=>r.FinalSymbol == winSymbol).ToArray();
            foreach (var reel in winReels)
            {
                reel.StartWin();
            }
        }

        private void StopWinAnimation()
        {
            foreach (var reel in _reels)
            {
                reel.StopWin();
            }
        }
        
        private bool IsSpinning()
        {
            foreach (var reel in _reels)
            {
                if (reel.IsSpinning)
                {
                    return true;
                }
            }
            return false;
        }
    }
}
