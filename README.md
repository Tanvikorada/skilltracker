# SkillCensus â€” India's Open Human Talent Network

> Every skill. Every district. Findable.

**SkillCensus** makes India's 450 million skilled workers discoverable â€” welders, coders, nurses, artisans â€” no middlemen, no fees, ever.

## Features

- ðŸ—ºï¸ **Real-Time Talent Map** â€” Live Leaflet map showing skill clusters across every district
- ðŸ’¬ **Built-in Secure Chat** â€” Connect and communicate directly on-platform
- âœ… **Skill Verification** â€” Government certificates, peer endorsements, employer references
- ðŸ“Š **Personal Dashboard** â€” Track profile views, requests, and skill demand trends
- ðŸŒ **Works for Everyone** â€” Optimized for 2G, designed for the 95% LinkedIn never reached
- ðŸ”’ **Privacy First** â€” Phone number stays hidden until YOU choose to share

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Maps**: Leaflet.js + OpenStreetMap via CARTO dark tiles
- **Fonts**: Cabinet Grotesk, JetBrains Mono, Instrument Serif

## Quick Start

```bash
# Just open the file
open index.html

# Or serve locally
python -m http.server 8080
```

## Firebase Setup (Required for Real Data)\n\n1. Create a Firebase project.\n2. Enable Email/Password in Authentication.\n3. Create Firestore Database.\n4. Paste config into `app.js`.\n5. Deploy on Vercel.\n\nSee `FIREBASE_SETUP.md` for details.\n\n## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) â†’ Import project
3. Select this repo â†’ Deploy
4. Your site is live at `your-project.vercel.app` ðŸŽ‰

## License

MIT Â© SkillCensus Team



Legacy Supabase files can be ignored (supabase_schema.sql, SUPABASE_SETUP.md).

