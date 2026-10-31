# FPL Auction 2026-27 dashboard

- `index.html` is the dashboard page (published with GitHub Pages).
- `squads.json` is who owns whom. **Edit this for the January trades.**
- `data/points.json` is written automatically every hour by `.github/workflows/update.yml` (script: `scripts/update.mjs`). Don't edit it by hand.

## January trades

Each player is one entry in `squads.json`. `from_gw` is the first gameweek the player counts for, and `to_gw` is the last one (`null` = still owned).

Tom sells Pickford after GW20 and buys Haaland for £10.5m from GW21:

1. On Pickford's entry change `"to_gw": null` to `"to_gw": 20`.
2. Add a new entry for the buyer:
   `{ "owner": "Tom", "player": "Haaland", "price": 10.5, "from_gw": 21, "to_gw": null }`

Use the name as FPL spells it. If two players share a name, add `"team": "MCI"` (the 3-letter club code). Pickford keeps the points he scored up to GW20 and stops counting after that. Budget left is £100 minus the price of players currently owned.

If a name can't be matched, the Update points run fails (red cross under the Actions tab) and the log says which entry to fix. The page keeps showing the last good points meanwhile.

Note: GitHub pauses scheduled runs in a repository that has had no activity for 60 days. Open Actions and re-enable it if that ever happens.
