# LIVE monthly creator rankings

The LIVE panel publishes a monthly ranking on the first day of each month at 05:00 UTC, using observations collected during the previous calendar month. The daily job collects official API measurements; it does **not** change the published top during the month.

## Ranking method

- **YouTube:** monthly growth in channel subscribers and total views, using official YouTube Data API v3 channel statistics. The period needs observations at least 20 days apart.
- **Twitch:** average concurrent viewers from daily official Twitch Helix observations, with at least three distinct live days in the month.
- **Groups:** region, platform, language, category and subcategory. At most five creators are published per group.
- **Regions:** RU, UA, DE, US and GB. A creator is ranked only when the country is available from official YouTube channel metadata or an administrator has verified the region for that creator. Twitch Helix does not provide a broadcaster's country, so Twitch region assignments must be verified separately.
- This is FREEzzzGames' calculation from official platform API metrics, **not an official monthly creator leaderboard published by YouTube or Twitch**. The platforms do not expose a single cross-platform monthly creator ranking for every region and subcategory.

If a period has insufficient data, publication fails and the previous published ranking is retained.

## Required server configuration

Set these on the Render server service, never in client-side portal variables:

- `YOUTUBE_DATA_API_KEY`
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `LIVE_REFRESH_SECRET`
- `DATABASE_URL` — persistent PostgreSQL storage is required to retain monthly observations across restarts.

Set these GitHub repository Actions secrets:

- `LIVE_REFRESH_SECRET` — must match the Render server value.
- `LIVE_API_BASE` — base URL of the Render server (optional only while the workflow's default URL is correct).

The health endpoint `/api/live/health` reports whether credentials and persistent storage are configured, without exposing secret values.
