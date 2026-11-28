using Fireball.Game.Client.Models;

namespace LuckyWheelSample
{
    public class SpinResponse : BaseResponse
    {
        public const string NAME = "spin-result";
        
        public Symbol Symbol;
        public long WinAmount;
        public long Balance;
    }
}