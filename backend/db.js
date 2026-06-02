/**
 * Pure-JS JSON file database — no native compilation required.
 * All data is stored in data.json next to this file.
 */
const fs   = require('fs');
const path = require('path');

const DB_PATH = process.env.DATA_PATH
  ? require('path').join(process.env.DATA_PATH, 'data.json')
  : path.join(__dirname, 'data.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {
      users:   [],
      tasks:   [],
      entries: [],
      seq:     { users: 1, tasks: 1, entries: 1 },
    };
  }
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

let db = load();

if (db.users.length === 0) {
  db.users = [
    { id: 1, name: 'Pravallika', color: '#7c3aed' },
    { id: 2, name: 'Anand',     color: '#db2777' },
  ];
  db.seq = { users: 3, tasks: 1, entries: 1 };
}

if (db.tasks.length === 0) {
  db.tasks = [
    { id: 1, name: 'Exercise',             user_id: null },
    { id: 2, name: 'Walking',              user_id: null },
    { id: 3, name: 'Unload dishwasher',    user_id: null },
    { id: 4, name: 'Cut veggies for salad',user_id: null },
    { id: 5, name: 'Fold blankets',        user_id: null },
  ];
  db.seq.tasks = 6;
}

// Migration: add user_id to any task that pre-dates this field
db.tasks.forEach(t => { if (!('user_id' in t)) t.user_id = null; });

save(db);

// ── Helpers ──────────────────────────────────────────────────────────────────

function num(v) { return Number(v); }

// ── Exported methods ──────────────────────────────────────────────────────────

module.exports = {
  // Users
  getUsers() {
    return db.users;
  },
  updateUser(id, name) {
    const u = db.users.find(u => u.id === num(id));
    if (u) { u.name = name; save(db); }
  },

  // Tasks
  getTasks(userId) {
    const uid = userId != null ? num(userId) : null;
    return [...db.tasks]
      .filter(t => t.user_id === null || t.user_id === uid)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  addTask(name, userId) {
    const uid = userId != null ? num(userId) : null;
    const visible = db.tasks.filter(t => t.user_id === null || t.user_id === uid);
    if (visible.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      const err = new Error('Task already exists');
      err.status = 409;
      throw err;
    }
    const task = { id: db.seq.tasks++, name, user_id: uid };
    db.tasks.push(task);
    save(db);
    return task;
  },
  deleteTask(id) {
    const tid  = num(id);
    db.tasks   = db.tasks.filter(t => t.id !== tid);
    db.entries = db.entries.filter(e => e.task_id !== tid);
    save(db);
  },

  // Entries
  getEntries(date, userId) {
    return db.entries
      .filter(e => e.date === date && e.user_id === num(userId))
      .map(e => ({ task_id: e.task_id, completed: e.completed }));
  },
  saveEntry(userId, taskId, date, completed) {
    const uid      = num(userId);
    const tid      = num(taskId);
    const existing = db.entries.find(
      e => e.user_id === uid && e.task_id === tid && e.date === date
    );
    if (existing) {
      existing.completed = completed ? 1 : 0;
    } else {
      db.entries.push({
        id:        db.seq.entries++,
        user_id:   uid,
        task_id:   tid,
        date,
        completed: completed ? 1 : 0,
      });
    }
    save(db);
  },

  // Weekly progress
  getWeeklyProgress(userId, startDate) {
    const end = new Date(startDate);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split('T')[0];

    return db.entries
      .filter(e =>
        e.user_id === num(userId) &&
        e.date >= startDate &&
        e.date <= endStr
      )
      .map(e => ({
        date:      e.date,
        task_id:   e.task_id,
        completed: e.completed,
        task_name: db.tasks.find(t => t.id === e.task_id)?.name ?? '',
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.task_name.localeCompare(b.task_name));
  },

  // Monthly progress
  getMonthlyProgress(userId, year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;

    const byDate = {};
    db.entries
      .filter(e => e.user_id === num(userId) && e.date.startsWith(prefix))
      .forEach(e => {
        if (!byDate[e.date]) byDate[e.date] = { total: 0, done: 0 };
        byDate[e.date].total += 1;
        if (e.completed) byDate[e.date].done += 1;
      });

    return Object.entries(byDate)
      .map(([date, { total, done }]) => ({ date, total, done }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  // Stats (streak + all-time completions)
  getStats(userId) {
    const uid   = num(userId);
    const today = new Date().toISOString().split('T')[0];

    let streak = 0;
    const cur  = new Date();
    for (let i = 0; i < 365; i++) {
      const d    = cur.toISOString().split('T')[0];
      const done = db.entries.filter(e => e.user_id === uid && e.date === d && e.completed).length;
      if (done > 0) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else if (d === today) {
        cur.setDate(cur.getDate() - 1); // today not logged yet — keep looking back
      } else {
        break;
      }
    }

    const totalCompleted = db.entries.filter(e => e.user_id === uid && e.completed).length;
    return { streak, totalCompleted };
  },
};
