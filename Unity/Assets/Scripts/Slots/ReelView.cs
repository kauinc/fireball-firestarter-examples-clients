using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace SlotSample
{
    public class ReelView : MonoBehaviour
    {
        [SerializeField] private Image _symbolImage;
        [SerializeField] private Sprite[] _symbolSprites;
        [SerializeField] private float _spinInterval = 0.07f;

        public IEnumerator SpinTo(
            SlotSymbol target,
            float duration)
        {
            float elapsed = 0f;

            while (elapsed < duration)
            {
                int randomIndex = Random.Range(
                    0, _symbolSprites.Length);

                _symbolImage.sprite = _symbolSprites[randomIndex];

                yield return new WaitForSeconds(_spinInterval);
                elapsed += _spinInterval;
            }

            SetSymbol(target);
        }

        private void SetSymbol(SlotSymbol symbol)
        {
            _symbolImage.sprite = _symbolSprites[(int)symbol];
        }
    }
}