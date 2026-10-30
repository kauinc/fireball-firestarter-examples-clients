using Fireball.Game.Client;
using Fireball.Game.Client.Models;

namespace SlotsSample
{
    public class SpinRequest : BaseRequest
    {
        public long BetAmount;

        public SpinRequest(long betAmount, FireballSession session)
            : base(GameMessages.SPIN_REQUEST, session)
        {
            BetAmount = betAmount;
        }
    }
}