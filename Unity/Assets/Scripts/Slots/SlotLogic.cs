using System;
using System.Collections;
using Fireball.Game.Client;
using Fireball.Game.Client.Models;
using Fireball.Game.Client.Modules;
using Random = UnityEngine.Random;

namespace SlotSample
{
    public class SlotLogic : IDisposable
    {
        private readonly IFireball _fireball;
        private readonly SlotView _view;
        private readonly FireballSettings _settings;
        private readonly LogLevels _logLevel;

        private SlotStatus _status = SlotStatus.None;

        public SlotLogic(
            IFireball fireball,
            SlotView view,
            FireballSettings settings,
            LogLevels logLevel)
        {
            _fireball = fireball;
            _view = view;
            _settings = settings;
            _logLevel = logLevel;

            Initialize();

            _view.OnClickSpin += OnSpinClicked;
        }

        public void Dispose()
        {
            _view.OnClickSpin -= OnSpinClicked;
        }

        private void Initialize()
        {
            if (_fireball.IsAuth)
            {
                PrepareSlots();
                return;
            }

            FireballConfig.LogLevel = _logLevel;
            SetStatus(SlotStatus.Loading);
            _fireball.Init(_settings,
                (session) =>
                {
                    _fireball.Authorize(new AuthRequest(_fireball.CurrentSession),
                        (response) => 
                            PrepareSlots(),
                        (error) => 
                            _view.ShowError($"Authorization failed:\n{error.Reason}"));
                },
                (error) => 
                    _view.ShowError($"Initialization failed:\n{error}"));
        }

        private void PrepareSlots()
        {
            SetStatus(SlotStatus.ReadyToPlay);
        }

        private void OnSpinClicked()
        {
            if (_status == SlotStatus.Spinning)
                return;

            _view.StartCoroutine(SpinRoutine());
        }

        private IEnumerator SpinRoutine()
        {
            SetStatus(SlotStatus.Spinning);

            var results = GetRandomResult(_view.ReelsCount);
            yield return _view.SpinAnimation(results);

            bool isWin = true;
            for (int i = 1; i < results.Length; i++)
            {
                if (results[i] != results[0])
                {
                    isWin = false;
                    break;
                }
            }

            SetStatus(isWin ? SlotStatus.Win : SlotStatus.Lose);
        }

        private void SetStatus(SlotStatus status)
        {
            _status = status;
            _view.UpdateView(_status);
        }

        private SlotSymbol[] GetRandomResult(int reelsCount)
        {
            var results = new SlotSymbol[reelsCount];
            var symbolsCount = Enum.GetValues(typeof(SlotSymbol)).Length;
            
            for (int i = 0; i < results.Length; i++)
            {
                results[i] = (SlotSymbol)Random.Range(0, symbolsCount);
            }
            
            return results;
        }
    }
}