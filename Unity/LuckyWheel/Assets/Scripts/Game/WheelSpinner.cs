using System;
using System.Collections;
using UnityEngine;

namespace LuckyWheelSample
{
    public class WheelSpinner : MonoBehaviour
    {
        [Header("References")] 
        [SerializeField] private RectTransform _spinningWheel;

        [Header("Start")] 
        [SerializeField] private float _accelerationDuration = 1.5f;
        [SerializeField] private float _maxSpeed = 720f;

        [Header("Stopping")] 
        [SerializeField] private float _stoppingDuration = 4f;
        [SerializeField] private float _extraRotations = 5f;
        [SerializeField] private Vector2 _bounceAngleRange = new Vector2(-7f, 7f);
        [SerializeField] private float _bounceDuration = 0.3f;

        private Coroutine _spinCoroutine;
        private bool _stopRequested;
        private int _targetSector;

        private float _currentSpeed;

        public bool IsSpinning { get; private set; }

        public void StartSpin()
        {
            if (IsSpinning)
                return;

            _stopRequested = false;
            IsSpinning = true;

            _spinCoroutine = StartCoroutine(SpinRoutine());
        }

        public void StopSpin(Symbol symbol)
        {
            if (!IsSpinning || _stopRequested)
                return;
            
            var sectorIndex = (int)symbol;
            if (sectorIndex < 0 || sectorIndex >= GameConst.SectorsCount)
            {
                Debug.LogError("Invalid sector index!");
                return;
            }

            _targetSector = sectorIndex;
            _stopRequested = true;
        }

        private IEnumerator SpinRoutine()
        {
            yield return AnimateAccelerating();

            yield return SpinningPhase();

            yield return StoppingPhase();

            IsSpinning = false;
            _spinCoroutine = null;
        }

        private IEnumerator AnimateAccelerating()
        {
            var time = 0f;
            while (time < _accelerationDuration)
            {
                time += Time.deltaTime;

                _currentSpeed = Mathf.Lerp(0f, _maxSpeed, Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(time / _accelerationDuration)));
                RotateWheel(_currentSpeed);
                yield return null;
            }

            _currentSpeed = _maxSpeed;
        }

        private IEnumerator SpinningPhase()
        {
            while (!_stopRequested)
            {
                RotateWheel(_currentSpeed);
                yield return null;
            }
        }

        private IEnumerator StoppingPhase()
        {
            var currentAngle = GetCurrentAngle();
            var targetAngle = GetTargetAngle(_targetSector);
            var bounceAngle = UnityEngine.Random.Range(_bounceAngleRange.x, _bounceAngleRange.y);
            var stopAngle = targetAngle - bounceAngle;

            // Calculate clockwise distance to target
            var targetDistance = Mathf.Repeat(currentAngle - stopAngle, 360f);

            // Add extra full rotations
            var totalRotation = _extraRotations * 360f + targetDistance;
            var time = 0f;
            var duration = _stoppingDuration;

            while (time < duration)
            {
                time += Time.deltaTime;

                // Ease out cubic
                var easedT = 1f - Mathf.Pow(1f - Mathf.Clamp01(time / duration), 3f);
                var rotation = totalRotation * easedT;

                SetWheelAngle(currentAngle - rotation);

                yield return null;
            }

            // Ensure exact target position
            SetWheelAngle(stopAngle);

            // Small backward bounce
            yield return StartCoroutine(BounceBack(-bounceAngle, _bounceDuration));

            SetWheelAngle(targetAngle);
        }

        private IEnumerator BounceBack(float bounceAngle, float bounceDuration)
        {
            var time = 0f;
            var currentAngle = GetCurrentAngle();

            while (time < _bounceDuration)
            {
                time += Time.deltaTime;

                var eased = Mathf.Sin(Mathf.Clamp01(time / bounceDuration) * Mathf.PI * 0.5f);
                var rotation = bounceAngle * eased;

                SetWheelAngle(currentAngle - rotation);

                yield return null;
            }
        }

        private void RotateWheel(float speed)
        {
            SetWheelAngle(_spinningWheel.eulerAngles.z - speed * Time.deltaTime);
        }

        private float GetCurrentAngle()
        {
            return Mathf.Repeat(_spinningWheel.eulerAngles.z, 360f);
        }

        private void SetWheelAngle(float angle)
        {
            _spinningWheel.rotation = Quaternion.Euler(0f, 0f, angle);
        }

        private float GetTargetAngle(int sectorIndex)
        {
            return Mathf.Repeat(sectorIndex * GameConst.SectorAngle, 360f);
        }
    }
}
