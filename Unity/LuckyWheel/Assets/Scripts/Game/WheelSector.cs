using UnityEngine;
using UnityEngine.UI;

namespace LuckyWheelSample
{
    public class WheelSector :MonoBehaviour
    {
        [SerializeField] private Symbol _symbol;
        [SerializeField] private Image _image;
        [SerializeField] private Text _label;
        
        public Symbol Symbol => _symbol;
        public Image Image => _image;
        public Text Label => _label;
    }
}