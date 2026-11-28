using Fireball.Game.Client;
using Fireball.Game.Client.Models;

namespace LuckyWheelSample
{
    public class SpinRequest : BaseRequest
    {
        public const string NAME = "spin-request";
        
        public long BetAmount;

        public SpinRequest(long betAmount, FireballSession session)
            : base(NAME, session)
        {
            BetAmount = betAmount;
        }
    }
}