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

## Supabase Setup (Required for Real Data)

1. Create a Supabase project.
2. Run the SQL in `supabase_schema.sql`.
3. Copy your Project URL + anon key into `app.js`.
4. Deploy on Vercel.

See `SUPABASE_SETUP.md` for details.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) â†’ Import project
3. Select this repo â†’ Deploy
4. Your site is live at `your-project.vercel.app` ðŸŽ‰

## License

MIT Â© SkillCensus Team

