using Fireball.Game.Client;
using Fireball.Game.Client.Modules;
using UnityEngine;

namespace SlotSample
{
    public class SlotStartUp : MonoBehaviour
    {
        [Header("Reels")] 
        [SerializeField] private SlotView _view;

        [Header("Configs")] 
        [SerializeField] private FireballSettings _customSettings;
        [SerializeField] private LogLevels _logLevel = LogLevels.Information;

        private SlotLogic _logic;

        private void Awake()
        {
            IFireball fireball = Fireball.Game.Client.Fireball.Instance;
            _logic = new SlotLogic(fireball, _view, _customSettings, _logLevel);
        }

        private void OnDestroy()
        {
            _logic?.Dispose();
        }
    }
}