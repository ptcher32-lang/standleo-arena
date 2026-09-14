# STANDLEO LITE Arena

Competitive web platform for STANDLEO LITE. Original UI (not a FACEIT clone). Rank titles and MMR ranges are locked to the STANDLEO table.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Demo accounts

- Player: `player@standleo.local` / `Player#2026`
- Admin: `admin@standleo.local` / `Admin#2026`

New accounts start at **500 MMR → Bronze 4**. Passwords are stored as scrypt hashes. Sessions use httpOnly cookies.
In production, set `MATCH_IMPORT_TOKEN` to a long random secret and keep
`RESET_TOKEN_DEBUG=false`; reset tokens must be delivered by a real mail service.

## Architecture

- `src/lib/ranks.ts` — single rank resolver (`getRankByMmr`)
- `src/lib/mmr.ts` — MMR deltas after matches
- `src/lib/standleo.ts` — game-server adapter stub (no invented API)
- `src/lib/db.ts` — JSON store in `data/store.json`
- `src/app/api/*` — REST endpoints

When a real STANDLEO LITE server exists, implement `StandleoLiteClient` in `src/lib/standleo.ts` only.
