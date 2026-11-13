using System;
using Fireball.Game.Client.Tools;
using UnityEngine;
using UnityEngine.UI;

namespace HelloWorld
{
    public class GameView : MonoBehaviour
    {
        [SerializeField] private Button _initializeButton;
        [SerializeField] private Button _authorizeButton;
        [SerializeField] private Button _sendButton;
        [SerializeField] private Text _statusText;
        [SerializeField] private Text _balanceText;
        [SerializeField] private RectTransform _balancePanel;

        public event Action OnClickInitialize;
        public event Action OnClickAuthorize;
        public event Action OnClickSend;

        private void Awake()
        {
            _initializeButton.onClick.AddListener(() => OnClickInitialize?.Invoke());
            _authorizeButton.onClick.AddListener(() => OnClickAuthorize?.Invoke());
            _sendButton.onClick.AddListener(() => OnClickSend?.Invoke());
        }

        private void OnDestroy()
        {
            _initializeButton.onClick.RemoveAllListeners();
            _authorizeButton.onClick.RemoveAllListeners();
            _sendButton.onClick.RemoveAllListeners();
        }

        public void Render(
            Status status,
            string statusMessage)
        {
            _statusText.text = statusMessage;
            _initializeButton.interactable = status == Status.None;
            _authorizeButton.interactable = status == Status.Initialized;
            _sendButton.interactable = status == Status.Ready;
            _balancePanel.gameObject.SetActive(status >= Status.Ready);
        }

        public void UpdateBalance(long amount, string currency)
        {
            _balanceText.text = CurrencyHelper.FormatMoney(amount, currency);
        }
    }
}