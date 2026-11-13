using System;
using Fireball.Game.Client;
using Fireball.Game.Client.Models;
using Fireball.Game.Client.Modules;
using UnityEngine;

namespace HelloWorld
{
    public class GameLogic : IDisposable
    {
        private readonly IFireball _fireball;
        private readonly GameView _view;
        private readonly FireballSettings _settings;
        private readonly LogLevels _logLevel;

        private Status _status = Status.None;
        private GameState _gameState;

        public GameLogic(
            IFireball fireball,
            GameView view,
            FireballSettings settings,
            LogLevels logLevel)
        {
            _fireball = fireball;
            _view = view;
            _settings = settings;
            _logLevel = logLevel;

            _view.OnClickInitialize += Initialize;
            _view.OnClickAuthorize += Authorize;
            _view.OnClickSend += SendHello;

            UpdateView();
        }

        private void Initialize()
        {
            if (_status != Status.None)
                return;

            FireballConfig.LogLevel = _logLevel;
            SetStatus(Status.Initializing, "Initializing...");
            _fireball.Init(
#if UNITY_EDITOR
                _settings,
#endif
                (session) =>
                    SetStatus(Status.Initialized, "Initialization successful!"),
                (error) => 
                    SetStatus(Status.None, $"Initialization failed:\n{error}"));
        }

        private void Authorize()
        {
            if (_status != Status.Initialized)
                return;

            SetStatus(Status.Authorizing, "Authorizing...");
            _fireball.Authorize<AuthRequest, AuthResponse<GameState>>(new AuthRequest(_fireball.CurrentSession),
                (response) =>
                {
                    _gameState = response.GameState;
                    _view.UpdateBalance(response.Balance, response.Currency);
                    SetStatus(Status.Ready, "Authorization successful!");
                },
                (error) => 
                    SetStatus(Status.Initialized, $"Authorization failed:\n{error.Reason}"));
        }

        private void DemoAuth()
        {
            if (_status != Status.Initialized)
                return;

            SetStatus(Status.Authorizing, "Authorizing...");
            _fireball.DemoAuthorize<AuthResponse>("USD", 54321,
                (response) =>
                {
                    _view.UpdateBalance(response.Balance, response.Currency);
                    SetStatus(Status.Ready, "Authorization successful!");
                },
                (error) =>
                    SetStatus(Status.Initialized, $"Authorization failed:\n{error.Reason}"));
        }

        private void SendHello()
        {
            if (_status != Status.Ready)
                return;

            SetStatus(Status.WaitingForResponse, "Waiting for response...");

            var request = new HelloRequest("Hello, Server!", _fireball.CurrentSession);
            _fireball.SendRequest<HelloRequest, HelloResponse>(request, 
                (response) =>
                    SetStatus(Status.Ready, $"Message Received:\n{response.MessageText}"),
                (error) =>
                    SetStatus(Status.Ready, $"Failed:\n{error.Reason}"));
        }
        
        private void SetStatus(
            Status status,
            string message = null)
        {
            _status = status;
            UpdateView(message);
        }

        private void UpdateView(string message = null)
        {
            _view.Render(_status, message ?? string.Empty);
        }

        public void Dispose()
        {
            _view.OnClickInitialize -= Initialize;
            _view.OnClickAuthorize -= Authorize;
            _view.OnClickSend -= SendHello;
        }
    }
}
