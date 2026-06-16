# 🕐 Work Hours Tracker

Frontend-only app that talks directly to **Firebase Firestore**. No backend server needed, syncs across all your devices, and the free tier never pauses.

```
React (Vite) → Firebase SDK → Firestore Database
```

---

## 🗄️ Step 1: Create a Firebase project

1. Go to https://console.firebase.google.com → **Add project**
2. Give it a name (e.g. `work-hours-tracker`), accept the defaults, and create it.
   You can disable Google Analytics — it's not needed.

### Create the database

1. In the left sidebar, open **Build → Firestore Database**
2. Click **Create database**
3. Choose a location close to you, and start in **Production mode** (we'll set the rules below)

You do **not** need to create any tables/collections — `workplaces` and `sessions`
are created automatically the first time the app saves data.

### Set the security rules

In **Firestore Database → Rules**, paste this and click **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Personal use, no login — allow all reads/writes.
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ These rules let anyone who has your Firebase config read and write the data —
> the same "open" setup the app used before. Fine for a personal tracker. If you
> ever want it locked down, add Firebase Authentication and tighten these rules.

---

## 🔑 Step 2: Get your Firebase config

1. In the Firebase console, click the **⚙️ gear → Project settings**
2. Scroll to **Your apps**, click the **`</>` (Web)** icon to register a web app
3. Give it a nickname, click **Register app**
4. Firebase shows a `firebaseConfig` object — keep these six values handy:
   `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`

---

## ⚙️ Step 3: Configure the app

1. In the project folder, copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your values from the `firebaseConfig` object:
   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```

---

## 🚀 Step 4: Run the app

```bash
npm install
npm run dev
```

Open **http://localhost:5173** — you're done! 🎉

---

## 🌍 Step 5: Deploy to Vercel (optional)

1. Push your project to a GitHub repo
2. Go to https://vercel.com → New Project → Import your repo
3. Add all six **Environment Variables** from your `.env` (the `VITE_FIREBASE_*` keys)
4. Click Deploy

Your app is now live on the internet with a real, synced database!

---

## 📁 Project Structure

```
work-hours-tracker/
├── src/
│   ├── App.jsx        ← entire app (components + logic)
│   ├── db.js          ← Firebase client + data functions (reads from .env)
│   ├── main.jsx       ← React entry point
│   └── index.css      ← global styles
├── index.html
├── vite.config.js
├── package.json
├── .env.example       ← copy to .env and fill in your Firebase config
└── .gitignore
```

---

## 🛠️ Troubleshooting

**"Missing Firebase config" error**
→ You haven't created the `.env` file yet, or a value is blank. Run `cp .env.example .env` and fill in all six `VITE_FIREBASE_*` values.

**"Failed to connect to the database"**
→ Double-check the config values against Firebase → Project settings → Your apps.

**Data not saving / "Missing or insufficient permissions"**
→ Publish the security rules from Step 1 in Firestore Database → Rules.

**Nothing shows up across devices**
→ Make sure both devices use the same Firebase project (same `.env` values).
