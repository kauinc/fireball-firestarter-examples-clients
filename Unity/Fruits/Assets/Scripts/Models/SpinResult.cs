using Fireball.Game.Client.Models;

namespace FruitsSample
{
    public class SpinResponse : BaseResponse
    {
        public Symbol[] Symbols;
        public long WinAmount;
        public long Balance;
    }
}