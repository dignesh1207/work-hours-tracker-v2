# 🕐 Work Hours Tracker

A full-stack work hours tracking app with a real **PostgreSQL** database. Built with **React + Vite** on the frontend and **Express + PostgreSQL** on the backend.

## ✨ Features

- Manage multiple workplaces (name, hourly rate, color)
- Log work sessions with date, start/end times, and notes
- Auto-calculates hours and earnings (handles overnight shifts)
- **Dashboard** — today / week / month totals + monthly earnings
- **Weekly summary** — navigate between weeks, see a bar chart breakdown
- **Entries** — filter by workplace, export to CSV
- **Summary** — all-time totals per workplace
- Full **CRUD** powered by a real **PostgreSQL** server database

---

## 📁 Project Structure

```
work-hours-tracker/
├── backend/              ← Express API + PostgreSQL connection
│   ├── server.js         ← API server
│   ├── package.json
│   ├── .env.example      ← Copy to .env and fill in your DB credentials
│   └── .gitignore
│
├── frontend/             ← React app (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Setup Guide

You have **three options** for where to run PostgreSQL:

| Option | Best for | Effort |
|--------|----------|--------|
| **A — Cloud (Supabase / Neon / Render)** | Real deployment, accessing from multiple devices | Easy, free tier |
| **B — Local install** | Local development | Medium |
| **C — Docker** | Local development, no permanent install | Easy if you have Docker |

Pick one, then continue to **Step 2** below.

---

### Prerequisites

- **Node.js** v18 or higher → [download here](https://nodejs.org)
- Verify with: `node --version`

---

## Step 1: Set up PostgreSQL

### 🌥️ Option A — Cloud PostgreSQL (recommended, no install needed)

Use a free hosted PostgreSQL service. All of these give you a free tier:

#### Supabase (easiest)
1. Go to https://supabase.com and sign up
2. Create a new project — pick a region close to you and set a database password (**save it!**)
3. Once it's ready, go to **Project Settings → Database**
4. Copy the **Connection string** (URI format) — looks like:
   ```
   postgres://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. Continue to Step 2 below, and put this in your `.env` as `DATABASE_URL`
6. Set `DB_SSL=true` in `.env`

#### Neon
1. Go to https://neon.tech and sign up
2. Create a project
3. Copy the connection string from the dashboard
4. Put it in `.env` as `DATABASE_URL`, set `DB_SSL=true`

#### Render
1. Go to https://render.com and sign up
2. New → PostgreSQL (free tier)
3. Copy the **External Database URL**
4. Put it in `.env` as `DATABASE_URL`, set `DB_SSL=true`

---

### 💻 Option B — Local PostgreSQL install

#### Mac
```bash
brew install postgresql@16
brew services start postgresql@16
createdb work_hours
```

#### Windows
1. Download the installer: https://www.postgresql.org/download/windows/
2. Run it, set a password for the `postgres` user (**remember it!**)
3. Open **pgAdmin** (installed with PostgreSQL)
4. Right-click "Databases" → Create → Database… → name it `work_hours`

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql
sudo -u postgres createdb work_hours
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

After install, your settings will typically be:
```
host: localhost
port: 5432
database: work_hours
user: postgres
password: (whatever you set)
```

---

### 🐳 Option C — Docker

If you have Docker installed, run this one command:

```bash
docker run --name work-hours-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=work_hours \
  -p 5432:5432 \
  -d postgres:16
```

That's it. Database is now running on `localhost:5432`. Use these defaults in `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=work_hours
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
```

To stop later: `docker stop work-hours-pg`
To start again: `docker start work-hours-pg`

---

## Step 2: Configure the backend

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in your settings depending on which option you picked above.

**For cloud (Option A):**
```
DATABASE_URL=postgres://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres
DB_SSL=true
```

**For local install (Option B) or Docker (Option C):**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=work_hours
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
```

Then install dependencies:
```bash
npm install
```

---

## Step 3: Start the backend

```bash
npm start
```

You should see:
```
✓ Database tables ready
✓ Server running at http://localhost:4000
```

The tables (`workplaces`, `sessions`) are **auto-created on first run**. If you see an error here, your database connection settings are wrong — re-check your `.env`.

Verify in your browser: http://localhost:4000/api/health
Should return: `{"status":"ok","database":"connected",...}`

**Leave this terminal running.**

---

## Step 4: Start the frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. You're done! 🎉

---

## 🔌 How the Database Connects

```
 Browser (React)
       ↓ fetch('/api/sessions')
 Vite dev server (port 5173)
       ↓ proxies /api/* to port 4000
 Express server (port 4000)
       ↓ pg connection pool
 PostgreSQL server (localhost:5432 OR cloud)
```

1. **Frontend** calls `/api/...` endpoints via `src/api.js`
2. **Vite** proxies those requests to `http://localhost:4000` (see `vite.config.js`)
3. **Express** receives them and uses the **`pg`** library to run SQL queries
4. **`pg`** maintains a connection pool to your PostgreSQL server
5. Results are returned as JSON to the frontend

### Why a connection pool?

Unlike SQLite (a file), PostgreSQL is a network service. Opening a new connection per request would be slow. The `pg` library keeps a small pool of open connections ready to reuse — much faster.

### API Endpoints

| Method | Path                    | Description              |
|--------|-------------------------|--------------------------|
| GET    | `/api/health`           | Health check + DB status |
| GET    | `/api/workplaces`       | List all workplaces      |
| POST   | `/api/workplaces`       | Create a workplace       |
| PUT    | `/api/workplaces/:id`   | Update a workplace       |
| DELETE | `/api/workplaces/:id`   | Delete a workplace       |
| GET    | `/api/sessions`         | List sessions (filters: `?workplace_id=`, `?start_date=`, `?end_date=`) |
| POST   | `/api/sessions`         | Create a session         |
| PUT    | `/api/sessions/:id`     | Update a session         |
| DELETE | `/api/sessions/:id`     | Delete a session         |

---

## 🗄️ Inspecting Your Database

### GUI tools (recommended)
- **[pgAdmin](https://www.pgadmin.org/)** — official, full-featured (free)
- **[TablePlus](https://tableplus.com/)** — beautiful, free tier
- **[DBeaver](https://dbeaver.io/)** — open-source, cross-platform

Connect with the same credentials from your `.env`.

### Command line
```bash
# Local install:
psql -U postgres -d work_hours

# Docker:
docker exec -it work-hours-pg psql -U postgres -d work_hours

# Cloud (Supabase/Neon/Render):
psql "postgres://postgres:pass@host:5432/dbname"
```

Then:
```sql
\dt                                       -- list tables
SELECT * FROM workplaces;
SELECT * FROM sessions ORDER BY date DESC;
\q                                        -- quit
```

### Cloud dashboards
Supabase, Neon, and Render all have built-in web UIs to browse and query your database — just log into their dashboard.

---

## 🛠️ Troubleshooting

### "Could not connect to backend" in the browser
- Make sure backend is running (`npm start` in the `backend` folder)
- Visit http://localhost:4000/api/health — should say `database: connected`

### Backend startup error: `connection refused` or `ECONNREFUSED`
- PostgreSQL isn't running, OR the connection settings are wrong
- Local install: check it's started (`brew services list` on Mac, `sudo service postgresql status` on Linux)
- Docker: run `docker ps` to verify the container is running
- Cloud: double-check the connection string from your provider's dashboard

### Backend startup error: `password authentication failed`
- Wrong `DB_PASSWORD` in `.env`

### Backend startup error: `database "work_hours" does not exist`
- You haven't created the database yet (see Step 1)
- Local Mac/Linux: `createdb work_hours`
- Windows: use pgAdmin to create it

### `self signed certificate` error (cloud DBs)
- Set `DB_SSL=true` in `.env`

### Port 4000 or 5432 already in use
- Backend: change `PORT=4001` in `.env`
- PostgreSQL: change `DB_PORT` in `.env` and your DB setup
- If you change the backend port, also update the proxy target in `frontend/vite.config.js`

---

## 🚢 Deploying for Real

Want to put this on the internet?

1. **Database**: use a cloud provider (Supabase, Neon, Render — all have free tiers)
2. **Backend**: deploy to Render, Railway, Fly.io, or similar
   - Set the same `.env` variables in their dashboard
3. **Frontend**: run `npm run build` and deploy `frontend/dist/` to Vercel, Netlify, or Cloudflare Pages
   - Update `src/api.js` to point at your deployed backend URL instead of `/api`

---

## 📝 License

MIT — do whatever you want with this.
