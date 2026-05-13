# 🕐 Work Hours Tracker

Frontend-only app that talks directly to **Supabase**. No backend server needed.

```
React (Vite) → Supabase SDK → Supabase Database
```

---

## 🗄️ Step 1: Set up the database in Supabase

### Create the tables

1. Go to https://supabase.com/dashboard → your project
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**
4. Paste this SQL and click **"Run"**:

```sql
-- Workplaces table
CREATE TABLE IF NOT EXISTS workplaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  rate       NUMERIC,
  color      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workplace_id UUID NOT NULL REFERENCES workplaces(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_sessions_date      ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_workplace ON sessions(workplace_id);
```

5. You should see **"Success. No rows returned"** — that means it worked.

### Enable Row Level Security (RLS) — keep your data safe

Still in the SQL Editor, run this second query:

```sql
-- Allow all operations for now (personal use, no auth)
ALTER TABLE workplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on workplaces" ON workplaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sessions"   ON sessions   FOR ALL USING (true) WITH CHECK (true);
```

---

## 🔑 Step 2: Get your Supabase credentials

1. In your Supabase project, go to **⚙️ Settings → API**
2. You need two values:
   - **Project URL** — looks like `https://vwuxjcgmkrdzurzloccc.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`

---

## ⚙️ Step 3: Configure the app

1. In the project folder, copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your values:
   ```
   VITE_SUPABASE_URL=https://vwuxjcgmkrdzurzloccc.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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
3. Set these **Environment Variables** in Vercel:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Click Deploy

Your app is now live on the internet with a real database!

---

## 📁 Project Structure

```
work-hours-tracker/
├── src/
│   ├── App.jsx        ← entire app (components + logic)
│   ├── supabase.js    ← Supabase client (reads from .env)
│   ├── main.jsx       ← React entry point
│   └── index.css      ← global styles
├── index.html
├── vite.config.js
├── package.json
├── .env.example       ← copy to .env and fill in credentials
└── .gitignore
```

---

## 🛠️ Troubleshooting

**"Missing VITE_SUPABASE_URL" error**
→ You haven't created the `.env` file yet. Run `cp .env.example .env` and fill it in.

**"Failed to connect to Supabase"**
→ Your anon key or URL is wrong. Re-copy them from Supabase → Settings → API.

**Data not saving / RLS error**
→ Run the RLS policy SQL from Step 1 in the Supabase SQL Editor.

**Tables don't exist error**
→ Run the CREATE TABLE SQL from Step 1 in the Supabase SQL Editor.
