using System;
using System.Collections;
using Fireball.Game.Client.Tools;
using UnityEngine;
using UnityEngine.UI;
using Random = UnityEngine.Random;

namespace SlotSample
{
    public class SlotView : MonoBehaviour
    {
        [Header("Game")] 
        [SerializeField] private RectTransform _slots;
        [SerializeField] private ReelView[] _reels;

        [Header("UI")] 
        [SerializeField] private Button _spinButton;
        [SerializeField] private Text _resultText;
        [SerializeField] private Text _betText;
        [SerializeField] private Text _balanceText;

        [Header("Settings")] 
        [SerializeField] private float _spinDuration = 1f;
        [SerializeField] private float _delay = 0.1f;

        public int ReelsCount => _reels.Length;

        public event Action OnClickSpin;

        private void Awake()
        {
            _spinButton.onClick.AddListener(() => OnClickSpin?.Invoke());
        }

        private void OnDestroy()
        {
            _spinButton.onClick.RemoveAllListeners();
        }

        public void UpdateView(SlotStatus status, string message = null)
        {
            _slots.gameObject.SetActive(status > SlotStatus.Loading);
            _spinButton.gameObject.SetActive(status > SlotStatus.Loading);
            _spinButton.interactable = status >= SlotStatus.ReadyToPlay;
            _resultText.text = message ??
                               (status == SlotStatus.Loading ? "Loading..." :
                                   status == SlotStatus.Spinning ? "Spinning..." :
                                   status == SlotStatus.ReadyToPlay ? "Press Spin!" :
                                   status == SlotStatus.Win ? "You win!" :
                                   status == SlotStatus.Lose ? "Try again!" :
                                   string.Empty);
        }
        
        public void UpdateBet(long amount, string currency)
        {
            _betText.text = CurrencyHelper.FormatMoney(amount, currency);
        }
        
        public void UpdateBalance(long amount, string currency)
        {
            _balanceText.text = CurrencyHelper.FormatMoney(amount, currency);
        }
        
        public void ShowError(string message)
        {
            _resultText.text = message;
        }

        public IEnumerator SpinAnimation(SlotSymbol[] results)
        {
            var duration = Random.Range(1, _spinDuration + 1);
            for (int i = 0; i < _reels.Length; i++)
            {
                _reels[i].StartSpin();

                if (i < _reels.Length - 1)
                    yield return new WaitForSeconds(_delay);
            }

            yield return new WaitForSeconds(duration);
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
