using Fireball.Game.Client;
using Fireball.Game.Client.Modules;
using UnityEngine;

namespace LuckyWheelSample
{
    public class StartUp : MonoBehaviour
    {
        [Header("Reels")] 
        [SerializeField] private WheelView _view;

        [Header("Configs")] 
        [SerializeField] private FireballSettings _customSettings;
        [SerializeField] private LogLevels _logLevel = LogLevels.Information;

        private WheelLogic _logic;

        private void Awake()
        {
            IFireball fireball = Fireball.Game.Client.Fireball.Instance;
            _logic = new WheelLogic(fireball, _view, _customSettings, _logLevel);
        }

        private void OnDestroy()
        {
            _logic?.Dispose();
        }
    }
}