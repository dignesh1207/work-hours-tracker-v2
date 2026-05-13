/**
 * Work Hours Tracker - Backend Server
 *
 * Express + PostgreSQL REST API
 * Configure connection via .env file (see .env.example)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const PORT = process.env.PORT || 4000;

// ------------------------------------------------------------------
// DATABASE CONNECTION POOL
// ------------------------------------------------------------------
const pool = new Pool({
  // Either set DATABASE_URL in .env (e.g. postgres://user:pass@host:5432/dbname)
  // or use individual variables below.
  connectionString: process.env.DATABASE_URL,
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'work_hours',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // If your provider requires SSL (Render, Supabase, etc.), set DB_SSL=true
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// ------------------------------------------------------------------
// INIT: CREATE TABLES IF MISSING
// ------------------------------------------------------------------
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS workplaces (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        rate       NUMERIC,
        color      TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id           TEXT PRIMARY KEY,
        workplace_id TEXT NOT NULL REFERENCES workplaces(id) ON DELETE CASCADE,
        date         DATE NOT NULL,
        start_time   TEXT NOT NULL,
        end_time     TEXT NOT NULL,
        notes        TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_date      ON sessions(date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_workplace ON sessions(workplace_id);`);

    console.log('✓ Database tables ready');
  } finally {
    client.release();
  }
}

// Helper: format rows for frontend
function formatRow(row) {
  if (!row) return row;
  if (row.date instanceof Date) {
    row.date = row.date.toISOString().slice(0, 10);
  }
  // Postgres returns NUMERIC as a string - convert rate to number
  if (row.rate !== undefined && row.rate !== null) {
    row.rate = parseFloat(row.rate);
  }
  return row;
}

const formatRows = (rows) => rows.map(formatRow);

// ------------------------------------------------------------------
// EXPRESS APP
// ------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// Health check (also verifies database is reachable)
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', database: 'unreachable', error: e.message });
  }
});

// ------------------------------------------------------------------
// WORKPLACES
// ------------------------------------------------------------------
app.get('/api/workplaces', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM workplaces ORDER BY created_at ASC');
    res.json(formatRows(rows));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/workplaces', async (req, res) => {
  try {
    const { name, rate, color } = req.body;
    if (!name || !color) {
      return res.status(400).json({ error: 'name and color are required' });
    }
    const id = `wp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { rows } = await pool.query(
      'INSERT INTO workplaces (id, name, rate, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name, rate || null, color]
    );
    res.status(201).json(formatRow(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/workplaces/:id', async (req, res) => {
  try {
    const { name, rate, color } = req.body;
    const { rows } = await pool.query(
      'UPDATE workplaces SET name = $1, rate = $2, color = $3 WHERE id = $4 RETURNING *',
      [name, rate || null, color, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Workplace not found' });
    res.json(formatRow(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/workplaces/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM workplaces WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Workplace not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ------------------------------------------------------------------
// SESSIONS
// ------------------------------------------------------------------
app.get('/api/sessions', async (req, res) => {
  try {
    const { workplace_id, start_date, end_date } = req.query;
    let query = 'SELECT * FROM sessions WHERE 1=1';
    const params = [];

    if (workplace_id) { params.push(workplace_id); query += ` AND workplace_id = $${params.length}`; }
    if (start_date)   { params.push(start_date);   query += ` AND date >= $${params.length}`; }
    if (end_date)     { params.push(end_date);     query += ` AND date <= $${params.length}`; }

    query += ' ORDER BY date DESC, start_time DESC';
    const { rows } = await pool.query(query, params);
    res.json(formatRows(rows));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { workplace_id, date, start_time, end_time, notes } = req.body;
    if (!workplace_id || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'workplace_id, date, start_time, end_time are required' });
    }
    const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { rows } = await pool.query(
      `INSERT INTO sessions (id, workplace_id, date, start_time, end_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, workplace_id, date, start_time, end_time, notes || null]
    );
    res.status(201).json(formatRow(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/sessions/:id', async (req, res) => {
  try {
    const { workplace_id, date, start_time, end_time, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE sessions
       SET workplace_id = $1, date = $2, start_time = $3, end_time = $4, notes = $5
       WHERE id = $6 RETURNING *`,
      [workplace_id, date, start_time, end_time, notes || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(formatRow(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sessions WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ------------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------------
(async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`✓ Server running at http://localhost:${PORT}`);
      console.log(`  Try: http://localhost:${PORT}/api/health`);
    });
  } catch (e) {
    console.error('✗ Failed to start:', e.message);
    console.error('  Check your PostgreSQL connection settings in .env');
    process.exit(1);
  }
})();
