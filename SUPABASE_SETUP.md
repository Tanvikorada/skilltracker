# Supabase Setup

1. Create a Supabase project.
2. In the SQL editor, run the schema in `supabase_schema.sql`.
3. In Auth settings, enable Email/Password.
4. Copy your `Project URL` and `anon public` key.
5. Update `app.js`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
6. Deploy to Vercel.

Notes:
- Email confirmation: if enabled, users must confirm before first login.
- Realtime: messages use Supabase Realtime on the `messages` table.
