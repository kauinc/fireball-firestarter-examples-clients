using System;
using Fireball.Game.Client;
using UnityEditor;
using UnityEngine;

namespace Editor
{
    [InitializeOnLoad]
    public static class FireballRandomUser
    {
        private const string ResourcePath = "Fruits_FireballSettings";

        static FireballRandomUser()
        {
            EditorApplication.delayCall += ValidateSettings;
        }

        private static void ValidateSettings()
        {
            var settings = Resources.Load<FireballSettings>(ResourcePath);

            if (settings != null)
            {
                if (string.IsNullOrEmpty(settings.OperatorPlayerId))
                {
                    settings.OperatorPlayerId = Guid.NewGuid().ToString();
                }

                if (string.IsNullOrEmpty(settings.Token))
                {
                    settings.Token = Guid.NewGuid().ToString();
                }
            }
        }
    }
}