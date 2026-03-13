# Firebase Setup (Realtime Database)

1. Create a Firebase project.
2. Build -> Authentication -> Sign-in method:
   - Enable Email/Password.
   - Enable Google.
3. Build -> Realtime Database -> Create Database (Start in locked mode).
4. Go to Project Settings -> General -> Your apps -> Web app.
   - Copy the Firebase config and paste into `app.js` as `FIREBASE_CONFIG`.
   - Set `databaseURL` to your Realtime Database URL.
5. In Authentication -> Settings -> Authorized domains:
   - Add `localhost` for local testing.
   - Add your Vercel domain after deploy.
6. In Realtime Database -> Rules, paste the contents of `rtdb.rules`.

Notes:
- Run the site from a local server (not `file://`). Example: `python -m http.server 8080`.
- Email/password and Google sign-in both require a real HTTP/HTTPS origin.
