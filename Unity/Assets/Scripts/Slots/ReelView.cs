using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace SlotsSample
{
    public class ReelView : MonoBehaviour
    {
        private enum ReelPhase
        {
            Idle,
            Accelerating,
            Spinning,
            Stopping
        }

        [Header("Symbols (Top, Center, Bottom)")] 
        [SerializeField] private Image[] _symbolImages;

        [Header("Available Sprites")] 
        [SerializeField] private Sprite[] _availableSprites;

        [Header("Movement")] 
        [SerializeField] private float _spriteSpacing = 250f;

        [Header("Acceleration")] 
        [SerializeField, Min(0.1f)] private float _accelerationDuration = 0.6f;
        [SerializeField, Min(1f)] private float _maxSpeed = 1800f;

        [Header("Stopping")] 
        [SerializeField, Min(0)] private int _extraCycles = 1;
        [SerializeField, Min(0f)] private float _overshootDistance = 18f;
        [SerializeField, Min(0.01f)] private float _bounceDuration = 0.12f;

        private float _cycleDistance;
        private float _topLimit;
        private float _bottomLimit;

        private ReelPhase _phase = ReelPhase.Idle;
        private Coroutine _spinCoroutine;
        private Symbol _finalSymbol;
        private Image _finalImage;
        private bool _stopRequested;
        private float _speed;

        public bool IsSpinning => _phase != ReelPhase.Idle;

        private void Awake()
        {
            _cycleDistance = _spriteSpacing * _symbolImages.Length;
            _topLimit = 0.5f * _cycleDistance;
            _bottomLimit = -0.5f * _cycleDistance;
        }

        public void StartSpin()
        {
            if (!enabled || _phase != ReelPhase.Idle)
                return;

            _stopRequested = false;
            _finalSymbol = Symbol.None;
            _finalImage = null;
            _speed = 0;

            _spinCoroutine = StartCoroutine(SpinRoutine());
        }

        public void StopAt(Symbol targetSymbol)
        {
            if (_phase == ReelPhase.Idle ||
                _phase == ReelPhase.Stopping)
                return;

            _finalSymbol = targetSymbol;
            _stopRequested = true;
        }

        private IEnumerator SpinRoutine()
        {
            // Phase 1: acceleration.
            _phase = ReelPhase.Accelerating;
            yield return AnimateAccelerating(_accelerationDuration);
            
            // Phase 2: continuous spinning.
            _phase = ReelPhase.Spinning;
            yield return AnimateSpinning();
            
            // Phase 3: stop at the requested sprite.
            _phase = ReelPhase.Stopping;
            var finalDistance = CalculateFinalDistance();
            var stopDuration = CalculateFinalDuration(finalDistance);
            yield return AnimateStopping(finalDistance, stopDuration);
            yield return AnimateStopping(-_overshootDistance, _bounceDuration);

            // Correct tiny floating-point errors so the requested sprite finishes exactly at the center.
            MoveSymbols(-_finalImage.rectTransform.anchoredPosition.y);

            Reset();
        }

        private IEnumerator AnimateAccelerating(float duration)
        {
            var time = 0f;
            while (time < duration && !_stopRequested)
            {
                time += Time.deltaTime;
                
                // Ease-in: gradual acceleration.
                var eased = 1f - Mathf.Cos(Mathf.Clamp01(time / duration) * Mathf.PI * 0.5f);
                _speed = Mathf.Lerp(0, _maxSpeed, eased);
                MoveSymbols(_speed * Time.deltaTime);

                yield return null;
            }
        }

        private IEnumerator AnimateSpinning()
        {
            while (!_stopRequested)
            {
                _speed = _maxSpeed;
                MoveSymbols(_speed * Time.deltaTime);

                yield return null;
            }
            
            // If the requested sprite is not visible yet, continue moving until it enters the reel.
            while (_finalImage == null)
            {
                MoveSymbols(_speed * Time.deltaTime);
                yield return null;
            }
        }
        
        private IEnumerator AnimateStopping(float distance, float duration)
        {
            var time = 0f;
            var previousProgress = 0f;

            while (time < duration)
            {
                time += Time.deltaTime;
                
                // Ease-out: smooth deceleration.
                var eased = Mathf.Sin(Mathf.Clamp01(time / duration) * Mathf.PI * 0.5f);
                var currentProgress = distance * eased;
                
                MoveSymbols(currentProgress - previousProgress);
                
                previousProgress = currentProgress;
                yield return null;
            }

            MoveSymbols(distance - previousProgress);
        }

        private void MoveSymbols(float deltaY)
        {
            foreach (var symbol in _symbolImages)
            {
                var rect = symbol.rectTransform;
                var position = rect.anchoredPosition;
                position.y -= deltaY;
                
                if (position.y < _bottomLimit)
                {
                    position.y += _cycleDistance;
                    AssignSpriteOnWrap(symbol);
                }

                if (position.y > _topLimit)
                {
                    position.y -= _cycleDistance;
                }
                
                rect.anchoredPosition = position;
            }
        }

        private void AssignSpriteOnWrap(Image image)
        {
            if (_finalImage == image)
                return;
            
            if (_stopRequested && _finalImage == null)
            {
                _finalImage = image;
                image.sprite = GetSprite(_finalSymbol);
                return;
            }

            image.sprite = GetRandomSprite();
        }

        private Sprite GetRandomSprite()
        {
            return _availableSprites[Random.Range(0, _availableSprites.Length)];
        }

        private Sprite GetSprite(Symbol symbol)
        {
            return _availableSprites[Mathf.Clamp((int)symbol - 1, 0, _availableSprites.Length - 1)];
        }

        private float CalculateFinalDistance()
        {
            var targetY = _finalImage.rectTransform.anchoredPosition.y;

            // Distance needed to bring the target to center, moving only in the forward direction.
            var distanceToCenter = targetY >= 0 ? targetY : _cycleDistance - targetY;
            distanceToCenter += _extraCycles * _cycleDistance;

            // Move slightly past the target, then settle back.
            return distanceToCenter + _overshootDistance;
        }

        private float CalculateFinalDuration(float distance)
        {
            var referenceSpeed = Mathf.Max(_speed, _maxSpeed * 0.65f);
            return Mathf.Clamp(distance / referenceSpeed * Mathf.PI * 0.5f, 0.2f, 1.0f);
        }
        
        private void Reset()
        {
            _phase = ReelPhase.Idle;
            _stopRequested = false;
            _finalSymbol = Symbol.None;
            _finalImage = null;
            _speed = 0f;
            _spinCoroutine = null;
        }
    }
}