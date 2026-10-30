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
        
        private readonly long[] _bets = new long[]{ 50, 100, 200, 500, 1000, 2000 };

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
            _view.OnClickBetDecrease += OnBetDecreaseClicked;
            _view.OnClickBetIncrease += OnBetIncreaseClicked;
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
                    _fireball.Authorize<AuthRequest, AuthResponse<SlotsGameState>>(new AuthRequest(session),
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
            
            _gameState.Currency = response.Currency;
            _gameState.Balance = response.Balance;
            _gameState.WinAmount = 0;
            
            Debug.Log($"Bet = {_gameState.BetAmount} {response.Currency}");
            Debug.Log($"Win = {_gameState.WinAmount} {response.Currency}");
            Debug.Log($"Balance = {response.Balance} {response.Currency}");
            
            _view.UpdateBalance(_gameState);
            
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

            _gameState.IsSpinning = true;
            _gameState.WinAmount = 0;
            _gameState.Balance -= _gameState.BetAmount;
            _view.UpdateBalance(_gameState);
            
            _view.StartSpin();

            var request = new SpinRequest(_gameState.BetAmount, _fireball.CurrentSession);
            _fireball.SendRequest<SpinRequest, SpinResponse>(request, OnSpinResult, OnSpinError);
        }

        private void OnSpinResult(SpinResponse result)
        {
            _gameState.IsSpinning = false;
            _gameState.Symbols = result.Symbols;
            _gameState.WinAmount = result.WinAmount;
            _gameState.Balance = result.Balance;
            
            _view.StopSpin(result.Symbols);
        }

        private void OnSpinError(ErrorResponse error)
        {
            var symbols = GetRandomLoseResult(_view.ReelsCount);

            _gameState.IsSpinning = false;
            _gameState.Symbols = symbols;
            _gameState.WinAmount = 0;
            _gameState.Balance += _gameState.BetAmount;
            
            _view.StopSpin(symbols);
            _view.ShowError(error.Reason);
        }
        
        private void OnSpinStopped()
        {
            Debug.Log($"Status: {_status}");
            Debug.Log($"Symbols: [ {string.Join(" | ", _gameState.Symbols.Select(s => s.ToString()))} ]");
            Debug.Log($"Win = {_gameState.WinAmount} {_gameState.Currency}");
            Debug.Log($"Balance = {_gameState.Balance} {_gameState.Currency}");

            var isWin = _gameState.WinAmount > 0;
            _view.UpdateBalance(_gameState);
            SetStatus(isWin ? SlotStatus.Win : SlotStatus.Lose);

            if (isWin)
            {
                _view.StartWin(_gameState.Symbols[0]);
            }
        }
        
        private void OnBetDecreaseClicked()
        {
            SetBet(Array.IndexOf(_bets, _gameState.BetAmount) - 1);
        }
        
        private void OnBetIncreaseClicked()
        {
            SetBet(Array.IndexOf(_bets, _gameState.BetAmount) + 1);
        }

        private void SetBet(int betIndex)
        {
            _gameState.BetAmount = _bets[Mathf.Clamp(betIndex, 0, _bets.Length - 1)];
            _view.SetBet(_gameState.BetAmount, _gameState.Currency);
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