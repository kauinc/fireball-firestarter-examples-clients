using Fireball.Game.Client;
using Fireball.Game.Client.Modules;
using UnityEngine;

namespace HelloWorld
{
    public class StartUp : MonoBehaviour
    {
        [SerializeField] private GameView _view;

        [Header("Configs")] 
        [SerializeField] private FireballSettings _customSettings;
        [SerializeField] private LogLevels _logLevel = LogLevels.Information;

        private GameLogic _logic;

        private void Awake()
        {
            IFireball fireball = Fireball.Game.Client.Fireball.Instance;
            _logic = new GameLogic(fireball, _view, _customSettings, _logLevel);
        }

        private void OnDestroy()
        {
            _logic?.Dispose();
        }
    }
}