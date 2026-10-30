using System;
using Fireball.Game.Client.Tools;
using UnityEngine;
using UnityEngine.UI;

namespace SlotsSample
{
    public class AuthView : MonoBehaviour
    {
        [SerializeField] private Button _initializeButton;
        [SerializeField] private Button _authorizeButton;
        [SerializeField] private Button _playButton;
        [SerializeField] private Text _statusText;
        [SerializeField] private Text _balanceText;
        [SerializeField] private RectTransform _balancePanel;

        public event Action OnClickInitialize;
        public event Action OnClickAuthorize;
        public event Action OnClickPlay;

        private void Awake()
        {
            _initializeButton.onClick.AddListener(() => OnClickInitialize?.Invoke());
            _authorizeButton.onClick.AddListener(() => OnClickAuthorize?.Invoke());
            _playButton.onClick.AddListener(() => OnClickPlay?.Invoke());
        }

        private void OnDestroy()
        {
            _initializeButton.onClick.RemoveAllListeners();
            _authorizeButton.onClick.RemoveAllListeners();
            _playButton.onClick.RemoveAllListeners();
        }

        public void Render(
            AuthStatus status,
            string statusMessage)
        {
            _statusText.text = statusMessage;
            _initializeButton.interactable = status == AuthStatus.None;
            _authorizeButton.interactable = status == AuthStatus.Initialized;
            _playButton.interactable = status == AuthStatus.Authorized;
            _balancePanel.gameObject.SetActive(status == AuthStatus.Authorized);
        }

        public void UpdateBalance(long amount, string currency)
        {
            _balanceText.text = CurrencyHelper.FormatMoney(amount, currency);
        }
    }
}