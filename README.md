# SkillCensus - India''s Open Human Talent Network

Every skill. Every district. Findable.

SkillCensus makes India''s skilled workers discoverable - welders, coders, nurses, artisans - no middlemen, no fees.

## Features

- Real-time talent map (Leaflet + OpenStreetMap)
- Built-in chat
- Skill verification signals
- Personal dashboard
- Works on low bandwidth
- Privacy-first contact sharing

## Tech Stack

- Frontend: HTML, CSS, JavaScript (Vanilla)
- Maps: Leaflet.js + OpenStreetMap via CARTO
- Fonts: Cabinet Grotesk, JetBrains Mono, Instrument Serif

## Quick Start

```bash
# Serve locally (required for Firebase auth)
python -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## Firebase Setup (Realtime Database)

See `FIREBASE_SETUP.md` and apply the rules from `rtdb.rules`.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel and deploy.
3. Add your Vercel domain to Firebase Auth authorized domains.

## License

MIT License.

Legacy Supabase files can be ignored (supabase_schema.sql, SUPABASE_SETUP.md).
