# Unity Leaderboard Backend Guide

Use this guide in your Unity project to send leaderboard entries to the backend.

Current entry shape:

```json
{
  "name": "UnityPlayer",
  "kills": 12345,
  "damageDealt": 456789,
  "damageReceived": 234567
}
```

`damageDealt` and `damageReceived` are optional (they default to `0`), so existing clients that only send `name` and `kills` keep working.

> **Important — damage is cumulative (all-time).** The backend **adds** every `damageDealt` / `damageReceived` you send onto the player's stored total. `kills` is different: the backend keeps the **highest** value submitted. So:
> - **Damage:** send the amount from **that match only** (the delta since your last submission). The server sums them into an all-time total.
> - **Kills:** send the player's **best/final kill count**, the same as before.
>
> Sending a lifetime damage total every match would double-count (e.g. 500 then 800 stored = 1300). Send per-match damage so the totals add up correctly.

## Backend URL

For local testing on the same machine:

```text
http://localhost:3001/api/leaderboard
```

If Unity is running on a phone, another PC, or a built game, `localhost` means that device, not your computer. Use your computer/server IP or domain instead:

```text
http://YOUR_COMPUTER_IP:3001/api/leaderboard
https://grimnetwork.srvp.ro/api/leaderboard
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
  "damageDealt": 456789,
  "damageReceived": 234567
}
```

Rules:

- `name` is required.
- `kills` must be a non-negative whole number.
- `damageDealt` and `damageReceived` are optional non-negative whole numbers (default `0`).
- If the player already exists: `kills` keeps the **highest** value submitted; `damageDealt` and `damageReceived` are **added** to the stored totals.
- Send **per-match** damage (the delta), not a lifetime total — the server accumulates it for you.

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
    "damageDealt": 456789,
    "damageReceived": 234567
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
    [SerializeField] private string apiUrl = "https://grimnetwork.srvp.ro/api/leaderboard";

    [System.Serializable]
    private class KillsPayload
    {
        public string name;
        public int kills;
        public int damageDealt;
        public int damageReceived;
    }

    public void SubmitKills(string name, int kills, int damageDealt, int damageReceived)
    {
        StartCoroutine(PostKills(name, kills, damageDealt, damageReceived));
    }

    private IEnumerator PostKills(string name, int kills, int damageDealt, int damageReceived)
    {
        KillsPayload payload = new KillsPayload
        {
            name = name,
            kills = kills,
            damageDealt = damageDealt,
            damageReceived = damageReceived
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

Attach `LeaderboardClient` to a GameObject. Track the damage the player does and takes **during the current match**, then submit those per-match amounts when the match ends. The backend adds them onto the player's all-time totals.

```csharp
public class GameOverExample : MonoBehaviour
{
    [SerializeField] private LeaderboardClient leaderboard;

    // Accumulate these as the match plays.
    private int killsThisMatch;
    private int damageDealtThisMatch;
    private int damageReceivedThisMatch;

    // Call these from your combat code:
    public void OnEnemyKilled()                  => killsThisMatch++;
    public void OnDamageDealt(int amount)        => damageDealtThisMatch += amount;
    public void OnDamageReceived(int amount)     => damageReceivedThisMatch += amount;

    public void OnGameOver()
    {
        string name = "Player1";

        // Send THIS match's numbers. kills = best count (server keeps the max);
        // damage = this match only (server adds it to the all-time total).
        leaderboard.SubmitKills(name, killsThisMatch, damageDealtThisMatch, damageReceivedThisMatch);

        // Reset for the next match so you don't submit the same damage twice.
        killsThisMatch = 0;
        damageDealtThisMatch = 0;
        damageReceivedThisMatch = 0;
    }
}
```

> Damage values must be whole numbers. If your game tracks damage as a `float`, round before sending: `Mathf.RoundToInt(damageThisMatch)`.

## Economy (Money)

The Economy system tracks a **money balance** per entity (players and bots), keyed by the **same `name`** as the leaderboard (use the normalized display name — strip difficulty suffixes like `[Hard]` first, exactly as you do for leaderboard rows). Balances are stored on the same player record and persist across sessions in the same database.

Endpoint (same conventions as the leaderboard):

```text
http://localhost:3001/api/economy
```

> **Important — money is an absolute SET, not an add.** Unlike damage (which the server **adds**), a `POST /api/economy` **overwrites** the stored balance with the exact value you send, because money goes **down** when spent. The client is authoritative for the session: fetch the balance on load, apply kill rewards / spending locally, then post the resulting total.

### Get all balances

`GET /api/economy` returns a bare JSON array (empty `[]` if none):

```json
[
  { "name": "Player", "money": 1250 },
  { "name": "Bot_03", "money": 500 }
]
```

### Set a balance

`POST /api/economy` with:

```json
{ "name": "Player", "money": 1250 }
```

Rules:

- `name` is required (the normalized display name).
- `money` is a non-negative whole number of dollars. **Negatives are clamped to `0`** and fractional values are floored.
- The value **replaces** (does not add to) the stored balance.

### Unity C# example

```csharp
[System.Serializable]
private class MoneyPayload
{
    public string name;
    public int money;
}

// Overwrite the entity's balance with the current session total.
public IEnumerator SetMoney(string name, int money)
{
    MoneyPayload payload = new MoneyPayload { name = name, money = Mathf.Max(0, money) };
    byte[] body = Encoding.UTF8.GetBytes(JsonUtility.ToJson(payload));

    using UnityWebRequest request = new UnityWebRequest("http://localhost:3001/api/economy", "POST");
    request.uploadHandler = new UploadHandlerRaw(body);
    request.downloadHandler = new DownloadHandlerBuffer();
    request.SetRequestHeader("Content-Type", "application/json");

    yield return request.SendWebRequest();
}
```

## Test with curl

Before testing in Unity, confirm the backend works:

```bash
curl -X POST http://localhost:3001/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"UnityPlayer","kills":12345,"damageDealt":456789,"damageReceived":234567}'
```

Then check the leaderboard:

```bash
curl http://localhost:3001/api/leaderboard
```

And the economy (set then read a balance):

```bash
curl -X POST http://localhost:3001/api/economy \
  -H "Content-Type: application/json" \
  -d '{"name":"UnityPlayer","money":1250}'

curl http://localhost:3001/api/economy
```

## Common Issues

If Unity says it cannot connect:

- Make sure `npm run dev:api` is running.
- If testing from another device, replace `localhost` with your computer IP.
- Make sure your firewall allows port `3001`.
- For WebGL builds hosted on HTTPS, use an HTTPS backend URL too.
