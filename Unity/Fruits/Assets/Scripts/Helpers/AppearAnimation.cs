using System.Collections;
using UnityEngine;

namespace FruitsSample
{
    public class AppearAnimation : MonoBehaviour
    {
        [SerializeField] private CanvasGroup _canvas;
        [SerializeField] private float _scaleFromFactor = 0.5f;
        [SerializeField] private float _startDelay = 0.4f;
        [SerializeField] private float _duration = 0.4f;
        [SerializeField] private bool _autoEnable = false;

        private Coroutine _animationCoroutine;
        private Vector3 _startScale;
        
        public void OnEnable()
        {
            if (_autoEnable)
            {
                StartAnimation();
            }
        }

        public void StartAnimation()
        {
            if (_animationCoroutine != null)
            {
                StopAllCoroutines();
            }

            _animationCoroutine = StartCoroutine(AppearCoroutine());
        }

        private IEnumerator AppearCoroutine()
        {
            _canvas.alpha = 0;
            _startScale = transform.localScale;
            transform.localScale = _scaleFromFactor * _startScale;
            
            if (_startDelay > 0)
            {
                yield return new WaitForSeconds(_startDelay);
            }
            
            StartCoroutine(AnimationHelper.FadeIn(_canvas, _duration));
            StartCoroutine(AnimationHelper.ScaleUp(this.transform, transform.localScale, _startScale, _duration));
        }
    }
}
