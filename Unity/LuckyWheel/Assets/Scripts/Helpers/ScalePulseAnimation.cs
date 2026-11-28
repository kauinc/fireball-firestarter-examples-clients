using System.Collections;
using UnityEngine;

namespace LuckyWheelSample
{
    public class ScalePulseAnimation : MonoBehaviour
    {
        [SerializeField] private float _scaleUpDuration = 0.5f;
        [SerializeField] private float _scaleDownDuration = 0.8f;
        [SerializeField] private float _scaleFactor = 1.2f;
        [SerializeField] private bool _autoEnable = false;

        private Coroutine _animationCoroutine;
        private Vector3 _startScale;
        private Transform _target;

        public void Start()
        {
            if (_autoEnable)
            {
                StartAnimation(this.transform);
            }
        }

        public void StartAnimation(Transform target, int total = 0)
        {
            if (_animationCoroutine != null)
            {
                StopCoroutine(_animationCoroutine);
                _animationCoroutine = null;

                _target.localScale = _startScale;
            }

            _animationCoroutine = StartCoroutine(PulsingAnimation(target, total));
        }

        public void StopAnimation()
        {
            StartCoroutine(StopPulsingAnimation());
        }

        private IEnumerator PulsingAnimation(Transform target, int total = 0)
        {
            _target = target;
            _startScale = transform.localScale;
            var endScale = _startScale * _scaleFactor;
            
            var counter = 0;
            while (counter < total || total == 0)
            {
                yield return AnimationHelper.ScaleUp(_target, Vector3.one, endScale, 0.5f);
                yield return AnimationHelper.ScaleUp(_target, endScale, Vector3.one, 0.8f);
                counter++;
            }

            _animationCoroutine = null;
        }

        private IEnumerator StopPulsingAnimation()
        {
            if (_animationCoroutine != null)
            {
                StopCoroutine(_animationCoroutine);
                _animationCoroutine = null;

                yield return AnimationHelper.ScaleUp(_target, _target.localScale, _startScale, 0.2f);
            }
        }
    }
}