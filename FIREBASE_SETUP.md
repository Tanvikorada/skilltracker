# Firebase Setup

1. Create a Firebase project.
2. Go to Build -> Authentication and enable Email/Password.
3. Go to Build -> Firestore Database and create a database in production or test mode.
4. In Project Settings -> General, add a Web App and copy the Firebase config.
5. Paste the config values into `app.js` under `FIREBASE_CONFIG`.
6. Deploy on Vercel.

Firestore Collections Used:
- profiles (doc id = uid)
- connections (doc id = userId_targetId)
- threads (doc id auto, fields include pairKey)
- threadMembers (doc id = threadId_userId)
- threads/{threadId}/messages
- notifications
- endorsements

Notes:
- If you use production rules, allow authenticated users to read/write their data.

Firestore Rules (for testing)
- In Firebase Console -> Firestore -> Rules, paste contents of irestore.rules.

