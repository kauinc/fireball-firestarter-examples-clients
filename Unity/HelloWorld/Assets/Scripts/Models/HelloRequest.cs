using Fireball.Game.Client;
using Fireball.Game.Client.Models;

namespace HelloWorld
{
    public class HelloRequest : BaseRequest
    {
        public const string NAME = "hello-request";
        
        public string MessageText;

        public HelloRequest(string message, FireballSession session)
            : base(NAME, session)
        {
            MessageText = message;
        }
    }
}