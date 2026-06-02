const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ── Users ────────────────────────────────────────────────────────────────────

app.get('/api/users', (_req, res) => {
  res.json(db.getUsers());
});

app.patch('/api/users/:id', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  db.updateUser(req.params.id, name.trim());
  res.json({ success: true });
});

// ── Tasks ────────────────────────────────────────────────────────────────────

app.get('/api/tasks', (req, res) => {
  const { userId } = req.query;
  res.json(db.getTasks(userId));
});

app.post('/api/tasks', (req, res) => {
  const { name, userId } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Task name is required' });
  }
  try {
    const task = db.addTask(name.trim(), userId);
    res.status(201).json(task);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  db.deleteTask(req.params.id);
  res.json({ success: true });
});

// ── Entries ──────────────────────────────────────────────────────────────────

app.get('/api/entries', (req, res) => {
  const { date, userId } = req.query;
  if (!date || !userId) {
    return res.status(400).json({ error: 'date and userId are required' });
  }
  res.json(db.getEntries(date, userId));
});

app.post('/api/entries', (req, res) => {
  const { userId, taskId, date, completed } = req.body;
  db.saveEntry(userId, taskId, date, completed);
  res.json({ success: true });
});

// ── Weekly Progress ───────────────────────────────────────────────────────────

app.get('/api/progress/weekly', (req, res) => {
  const { userId, startDate } = req.query;
  res.json(db.getWeeklyProgress(userId, startDate));
});

// ── Monthly Progress ──────────────────────────────────────────────────────────

app.get('/api/progress/monthly', (req, res) => {
  const { userId, year, month } = req.query;
  res.json(db.getMonthlyProgress(userId, year, month));
});

// ── Stats ─────────────────────────────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  res.json(db.getStats(req.query.userId));
});

// ── Serve frontend build in production ────────────────────────────────────────

const distDir = path.join(__dirname, '..', 'frontend', 'dist');
if (require('fs').existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏠  Home Tracker API  →  http://localhost:${PORT}/api`);
  console.log(`   From other devices use your PC's IP address instead of localhost`);
  console.log(`   Find your IP: run  ipconfig  and look for IPv4 Address\n`);
});
