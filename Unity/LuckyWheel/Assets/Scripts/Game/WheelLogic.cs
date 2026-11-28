using System;
using System.Linq;
using System.Collections;
using System.Collections.Generic;
using Fireball.Game.Client;
using Fireball.Game.Client.Models;
using Fireball.Game.Client.Modules;
using UnityEngine;
using Random = UnityEngine.Random;

namespace LuckyWheelSample
{
    public class WheelLogic : IDisposable
    {
        private readonly IFireball _fireball;
        private readonly WheelView _view;
        private readonly FireballSettings _settings;
        private readonly LogLevels _logLevel;

        private WheelStatus _status = WheelStatus.None;
        private WheelGameState _gameState = null;
        private JackpotDetail _jackpot = null;
        
        private readonly long[] _bets = new long[]{ 50, 100, 200, 500, 1000, 2000 };

        public WheelLogic(
            IFireball fireball,
            WheelView view,
            FireballSettings settings,
            LogLevels logLevel)
        {
            _fireball = fireball;
            _view = view;
            _settings = settings;
            _logLevel = logLevel;

            Initialize();

            _fireball.OnJackpotUpdate += OnJackpotUpdated;
            _view.OnClickSpin += OnSpinClicked;
            _view.OnClickBetDecrease += OnBetDecreaseClicked;
            _view.OnClickBetIncrease += OnBetIncreaseClicked;
            _view.OnSpinStopped += OnSpinStopped;
        }

        public void Dispose()
        {
            _fireball.OnJackpotUpdate -= OnJackpotUpdated;
            _view.OnClickSpin -= OnSpinClicked;
            _view.OnClickBetDecrease -= OnBetDecreaseClicked;
            _view.OnClickBetIncrease -= OnBetIncreaseClicked;
            _view.OnSpinStopped -= OnSpinStopped;
        }

        private void Initialize()
        {
            FireballConfig.LogLevel = _logLevel;
            SetStatus(WheelStatus.Loading);

            _fireball.Init(
#if UNITY_EDITOR
                _settings,
#endif
                (session) =>
                {
                    _fireball.Authorize<AuthRequest, AuthResponse<WheelGameState>>(new AuthRequest(session),
                        PrepareGame,
                        (error) => 
                            _view.ShowError($"Authorization failed:\n{error.Reason}"));
                },
                (error) => 
                    _view.ShowError($"Initialization failed:\n{error}"));
        }

        private void PrepareGame(AuthResponse<WheelGameState> response)
        {
            _gameState = response.GameState;
            
            _gameState.Currency = response.Currency;
            _gameState.Balance = response.Balance;
            _gameState.WinAmount = 0;
            
            Debug.Log($"Bet = {_gameState.BetAmount} {response.Currency}");
            Debug.Log($"Win = {_gameState.WinAmount} {response.Currency}");
            Debug.Log($"Balance = {response.Balance} {response.Currency}");
            
            _view.UpdateBalance(_gameState);

            _jackpot = response.Jackpots?.Find(j => j.TemplateId == GameConst.JackpotTemplateId);
            if (_jackpot == null)
            {
                _jackpot = new JackpotDetail();
                _jackpot.TemplateId = GameConst.JackpotTemplateId;
                _jackpot.Value = 0;
            }
            _view.SetJackpot(_jackpot.Value, response.Currency);
            
            SetStatus(WheelStatus.ReadyToPlay);
        }

        private void OnSpinClicked()
        {
            if (_status == WheelStatus.Spinning)
                return;

            if (_gameState.BetAmount > _gameState.Balance)
            {
                _view.ShowError("Not enough balance!");
                return;
            }
            
            SetStatus(WheelStatus.Spinning);

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
            _gameState.Symbol = result.Symbol;
            _gameState.WinAmount = result.WinAmount;
            _gameState.Balance = result.Balance;
            
            _view.StopSpin(result.Symbol);
        }

        private void OnSpinError(ErrorResponse error)
        {
            var symbol = GetRandomLoseResult();

            _gameState.IsSpinning = false;
            _gameState.Symbol = symbol;
            _gameState.WinAmount = 0;
            _gameState.Balance += _gameState.BetAmount;
            
            _view.StopSpin(symbol);
            _view.ShowError(error.Reason);
        }
        
        private void OnSpinStopped()
        {
            Debug.Log($"Status: {_status}");
            Debug.Log($"Sector: {_gameState.Symbol}");
            Debug.Log($"Win = {_gameState.WinAmount} {_gameState.Currency}");
            Debug.Log($"Balance = {_gameState.Balance} {_gameState.Currency}");

            var isWin = _gameState.WinAmount > 0;
            SetStatus(isWin ? WheelStatus.Win : WheelStatus.Lose);
            
            _view.UpdateBalance(_gameState);

            if (isWin)
            {
                _view.StartWin(_gameState.Symbol);
            }
            else
            {
                _view.LoseAnimation(_gameState.Symbol);
            }
        }

        private void OnJackpotUpdated(JackpotUpdateMessage jackpotMessage)
        {
            if (jackpotMessage.templateId != GameConst.JackpotTemplateId)
                return;
            
            if(_jackpot == null)
                return;

            _jackpot.Value = jackpotMessage.amountPlayerCurrency;
            _view.SetJackpot(_jackpot.Value, _gameState.Currency);
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
        
        private void SetStatus(WheelStatus status)
        {
            _status = status;
            _view.UpdateView(_status);
        }

        private Symbol GetRandomLoseResult()
        {
            var loseSymbols = GameConst.SymbolPayouts
                .Where(s => s.Value == 0)
                .Select(s => s.Key)
                .ToList();
            
            return loseSymbols[Random.Range(0, loseSymbols.Count)];
        }
    }
}