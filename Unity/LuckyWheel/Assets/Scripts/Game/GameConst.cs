using System.Collections.Generic;

namespace LuckyWheelSample
{
    public class GameConst
    {
        public const string JackpotTemplateId = "92d5b3f8-595e-4eda-a417-2df52ac9e4f0";
        public const float JackpotContributionPercent = 0.5f;
        public const long DefaultBet = 100;
        public const int SectorsCount = 8;
        public const float SectorAngle = 360f / SectorsCount;
        
        public static readonly Dictionary<Symbol, float> SymbolPayouts = new()
        {
            { Symbol.Tomato, 0.0f },
            { Symbol.Lemon, 0.0f },
            { Symbol.Clover, 1.0f },
            { Symbol.Cherry, 2.0f },
            { Symbol.Bell, 3.0f },
            { Symbol.Star, 5.0f },
            { Symbol.Diamond, 10.0f },
        };
        
        public static readonly Dictionary<Symbol, double> SymbolWeights = new()
        {
            { Symbol.Tomato, 0.33f },
            { Symbol.Lemon, 0.25f },
            { Symbol.Clover, 0.17f },
            { Symbol.Cherry, 0.12f },
            { Symbol.Bell, 0.08f },
            { Symbol.Star, 0.04f },
            { Symbol.Diamond, 0.01f },
        };
    }
}