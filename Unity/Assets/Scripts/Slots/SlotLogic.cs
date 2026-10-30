using System;
using System.Linq;
using System.Collections;
using System.Collections.Generic;
using Fireball.Game.Client;
using Fireball.Game.Client.Models;
using Fireball.Game.Client.Modules;
using UnityEngine;
using Random = UnityEngine.Random;

namespace SlotsSample
{
    public class SlotLogic : IDisposable
    {
        private readonly IFireball _fireball;
        private readonly SlotView _view;
        private readonly FireballSettings _settings;
        private readonly LogLevels _logLevel;

        private SlotStatus _status = SlotStatus.None;
        private SlotsGameState _gameState = null;

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
            _view.OnSpinStopped += OnSpinStopped;
        }

        public void Dispose()
        {
            _view.OnClickSpin -= OnSpinClicked;
            _view.OnSpinStopped -= OnSpinStopped;
        }

        private void Initialize()
        {
            if (_fireball.IsAuth && AuthLogic.Response != null)
            {
                PrepareSlots(AuthLogic.Response);
                return;
            }

            FireballConfig.LogLevel = _logLevel;
            SetStatus(SlotStatus.Loading);
            _fireball.Init(_settings,
                (session) =>
                {
                    _fireball.Authorize<AuthRequest, AuthResponse<SlotsGameState>>(new AuthRequest(_fireball.CurrentSession),
                        PrepareSlots,
                        (error) => 
                            _view.ShowError($"Authorization failed:\n{error.Reason}"));
                },
                (error) => 
                    _view.ShowError($"Initialization failed:\n{error}"));
        }

        private void PrepareSlots(AuthResponse<SlotsGameState> response)
        {
            _gameState = response.GameState;
            
            Debug.Log($"Bet = {_gameState.BetAmount} {response.Currency}");
            Debug.Log($"Balance = {response.Balance} {response.Currency}");
            
            _view.UpdateBet(_gameState.BetAmount, response.Currency);
            _view.UpdateBalance(response.Balance, response.Currency);
            
            SetStatus(SlotStatus.ReadyToPlay);
        }

        private void OnSpinClicked()
        {
            if (_status == SlotStatus.Spinning)
                return;

            if (_gameState.BetAmount > _gameState.Balance)
            {
                _view.ShowError("Not enough balance!");
                return;
            }
            
            SetStatus(SlotStatus.Spinning);
            
            _gameState.Balance -= _gameState.BetAmount;
            _view.UpdateBalance(_gameState);
            
            _view.StartSpin();

            var request = new SpinRequest(_gameState.BetAmount, _fireball.CurrentSession);
            _fireball.SendRequest<SpinRequest, SpinResponse>(request, OnSpinResult, OnSpinError);
        }

        private void OnSpinResult(SpinResponse result)
        {
            var isWin = result.WinAmount > 0;
            
            _gameState.Symbols = result.Symbols;
            _gameState.Balance = result.Balance;
            _gameState.WinAmount = result.WinAmount;
            
            _view.StopSpin(result.Symbols);
            SetStatus(isWin ? SlotStatus.Win : SlotStatus.Lose);
        }

        private void OnSpinError(ErrorResponse error)
        {
            var symbols = GetRandomLoseResult(_view.ReelsCount);

            _gameState.Symbols = symbols;
            _gameState.WinAmount = 0;
            _gameState.Balance += _gameState.BetAmount;
            
            _view.StopSpin(symbols);
            SetStatus(SlotStatus.Lose);

            _view.ShowError(error.Reason);
        }
        
        private void OnSpinStopped()
        {
            Debug.Log($"Status: {_status}");
            Debug.Log($"Symbols: [ {string.Join(" | ", _gameState.Symbols.Select(s => s.ToString()))} ]");
            Debug.Log($"Win = {_gameState.WinAmount} {_gameState.Currency}");
            Debug.Log($"Balance = {_gameState.Balance} {_gameState.Currency}");
            _view.UpdateBalance(_gameState);
        }

        private void SetStatus(SlotStatus status)
        {
            _status = status;
            _view.UpdateView(_status);
        }

        private Symbol[] GetRandomLoseResult(int reelsCount)
        {
            var results = new Symbol[reelsCount];
            var symbols = Enum.GetValues(typeof(Symbol))
                .Cast<Symbol>()
                .Where(s => s != Symbol.None)
                .ToList();
            
            if (reelsCount > symbols.Count)
                throw new ArgumentOutOfRangeException(nameof(reelsCount));
            
            for (int i = 0; i < results.Length; i++)
            {
                int index = Random.Range(0, symbols.Count);

                results[i] = symbols[index];
                symbols.RemoveAt(index);
            }

            return results;
        }
    }
}