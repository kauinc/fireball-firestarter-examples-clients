using Fireball.Game.Client.Models;

namespace HelloWorld
{
    public class HelloResponse : BaseResponse
    {
        public const string NAME = "hello-response";
        
        public string MessageText;
    }
}