using System;
using Fireball.Game.Client;
using Fireball.Game.Client.Models;
using Fireball.Game.Client.Modules;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace SlotSample
{
    public class AuthLogic : IDisposable
    {
        private readonly IFireball _fireball;
        private readonly AuthView _view;
        private readonly FireballSettings _settings;
        private readonly LogLevels _logLevel;

        private AuthStatus _status = AuthStatus.None;

        public static AuthResponse Response => _response;
        private static AuthResponse _response = null;

        public AuthLogic(
            IFireball fireball,
            AuthView view,
            FireballSettings settings,
            LogLevels logLevel)
        {
            _fireball = fireball;
            _view = view;
            _settings = settings;
            _logLevel = logLevel;

            _view.OnClickInitialize += Initialize;
            _view.OnClickAuthorize += Authorize;
            _view.OnClickPlay += Play;

            UpdateView();
        }

        private void Initialize()
        {
            if (_status != AuthStatus.None)
                return;

            FireballConfig.LogLevel = _logLevel;
            SetStatus(AuthStatus.Initializing, "Initializing...");
            _fireball.Init(_settings,
                (session) =>
                {
                    SetStatus(AuthStatus.Initialized, "Initialization successful!");
                },
                (error) => 
                    SetStatus(AuthStatus.None, $"Initialization failed:\n{error}"));
        }

        private void Authorize()
        {
            if (_status != AuthStatus.Initialized)
                return;

            SetStatus(AuthStatus.Authorizing, "Authorizing...");
            _fireball.Authorize(new AuthRequest(_fireball.CurrentSession),
                (response) =>
                {
                    Debug.Log($"Response: {response.ToJson()}");
                    Debug.Log($"Session: {_fireball.CurrentSession.ToJson()}");
                    _response = response;
                    _view.UpdateBalance(response.Balance, response.Currency);
                    SetStatus(AuthStatus.Authorized, "Authorization successful!");
                },
                (error) => 
                    SetStatus(AuthStatus.Initialized, $"Authorization failed:\n{error.Reason}"));
        }

        private void DemoAuth()
        {
            if (_status != AuthStatus.Initialized)
                return;

            SetStatus(AuthStatus.Authorizing, "Authorizing...");
            _fireball.DemoAuthorize("USD", 54321,
                (response) =>
                {
                    Debug.Log($"Response: {response.ToJson()}");
                    Debug.Log($"Session: {_fireball.CurrentSession.ToJson()}");
                    _response = response;
                    _view.UpdateBalance(response.Balance, response.Currency);
                    SetStatus(AuthStatus.Authorized, "Authorization successful!");
                },
                (error) =>
                    SetStatus(AuthStatus.Initialized, $"Authorization failed:\n{error.Reason}"));
        }

        private void Play()
        {
            if (_status != AuthStatus.Authorized)
                return;

            SetStatus(AuthStatus.Playing, "Loading...");
            
            SceneManager.LoadScene(1);
        }
        
        private void SetStatus(
            AuthStatus status,
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
            _view.OnClickPlay -= Play;
        }
    }
}
