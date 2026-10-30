using System.Collections;
using UnityEngine;

namespace SlotsSample
{
    public static class AnimationHelper
    {
        private const float C1 = 1.70158f;
        private const float C3 = C1 + 1f;

        public static IEnumerator ScaleUp(
            Transform element,
            Vector3 from,
            Vector3 to,
            float duration)
        {
            var elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                var progress = Mathf.Clamp01(elapsed / duration);

                element.localScale = Vector3.LerpUnclamped(
                    from,
                    to,
                    EaseOutBack(progress));


                yield return null;
            }

            element.localScale = to;
        }

        public static IEnumerator FadeIn(CanvasGroup group, float duration)
        {
            return Fade(group, 0, 1, duration);
        }

        public static IEnumerator FadeOut(CanvasGroup group, float duration)
        {
            return Fade(group, 1, 0, duration);
        }

        public static IEnumerator Fade(CanvasGroup group, float from, float to, float duration)
        {
            var elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                var progress = Mathf.Clamp01(elapsed / duration);
                group.alpha = Mathf.Lerp(from, to, progress);
                yield return null;
            }
        }

        private static float EaseOutQuad(float t)
        {
            return 1f - (1f - t) * (1f - t);
        }

        private static float EaseOutBack(float t)
        {
            return 1f + C3 * Mathf.Pow(t - 1f, 3f)
                      + C1 * Mathf.Pow(t - 1f, 2f);
        }
    }
}