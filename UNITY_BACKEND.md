# Unity Leaderboard Backend Guide

Use this guide in your Unity project to send leaderboard entries to the backend.

Current entry shape:

```json
{
  "name": "UnityPlayer",
  "kills": 12345,
  "difficulty": "Hard"
}
```

## Backend URL

For local testing on the same machine:

```text
http://localhost:3001/api/leaderboard
```

If Unity is running on a phone, another PC, or a built game, `localhost` means that device, not your computer. Use your computer/server IP or domain instead:

```text
http://YOUR_COMPUTER_IP:3001/api/leaderboard
https://yourdomain.com/api/leaderboard
```

For another device on your network to reach your computer, start the API with:

```bash
HOST=0.0.0.0 npm run dev:api
```

## Start the Backend

From the leaderboard site project:

```bash
npm run dev:api
```

For local testing, the API should print:

```text
Leaderboard API listening on http://127.0.0.1:3001
```

The backend database starts empty. Entries are stored in `server/leaderboard.json`.

## Submit Kills

Send a `POST` request to:

```text
/api/leaderboard
```

with JSON:

```json
{
  "name": "UnityPlayer",
  "kills": 12345,
  "difficulty": "Hard"
}
```

Rules:

- `name` is required.
- `kills` must be a non-negative whole number.
- `difficulty` is a string, for example `Easy`, `Normal`, `Hard`, or `Nightmare`.
- If the player already exists, the backend keeps their highest kill count.
  If the new submission is the new highest kill count, its `difficulty` is saved too.

## Get Leaderboard

Send a `GET` request to:

```text
/api/leaderboard
```

Response example:

```json
[
  {
    "name": "UnityPlayer",
    "kills": 12345,
    "difficulty": "Hard"
  }
]
```

## Unity C# Example

Create a script named `LeaderboardClient.cs`:

```csharp
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

public class LeaderboardClient : MonoBehaviour
{
    [SerializeField] private string apiUrl = "http://localhost:3001/api/leaderboard";

    [System.Serializable]
    private class KillsPayload
    {
        public string name;
        public int kills;
        public string difficulty;
    }

    public void SubmitKills(string name, int kills, string difficulty)
    {
        StartCoroutine(PostKills(name, kills, difficulty));
    }

    private IEnumerator PostKills(string name, int kills, string difficulty)
    {
        KillsPayload payload = new KillsPayload
        {
            name = name,
            kills = kills,
            difficulty = difficulty
        };

        string json = JsonUtility.ToJson(payload);
        byte[] body = Encoding.UTF8.GetBytes(json);

        using UnityWebRequest request = new UnityWebRequest(apiUrl, "POST");
        request.uploadHandler = new UploadHandlerRaw(body);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");

        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            Debug.Log("Kills submitted: " + request.downloadHandler.text);
        }
        else
        {
            Debug.LogError("Kills submit failed: " + request.error + " " + request.downloadHandler.text);
        }
    }
}
```

## Example Usage

Attach `LeaderboardClient` to a GameObject, then call:

```csharp
public class GameOverExample : MonoBehaviour
{
    [SerializeField] private LeaderboardClient leaderboard;

    public void OnGameOver()
    {
        string name = "Player1";
        int finalKills = 12345;
        string difficulty = "Hard";

        leaderboard.SubmitKills(name, finalKills, difficulty);
    }
}
```

## Test with curl

Before testing in Unity, confirm the backend works:

```bash
curl -X POST http://localhost:3001/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"UnityPlayer","kills":12345,"difficulty":"Hard"}'
```

Then check the leaderboard:

```bash
curl http://localhost:3001/api/leaderboard
```

## Common Issues

If Unity says it cannot connect:

- Make sure `npm run dev:api` is running.
- If testing from another device, replace `localhost` with your computer IP.
- Make sure your firewall allows port `3001`.
- For WebGL builds hosted on HTTPS, use an HTTPS backend URL too.
