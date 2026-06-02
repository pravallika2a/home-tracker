import { useState, useEffect, useCallback } from 'react';
import { getEntries, saveEntry, getTasks } from '../api';

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];

function toStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function labelFor(date) {
  const today = toStr(new Date());
  const ds    = toStr(date);
  const label = ds === today
    ? 'Today'
    : ds === toStr(new Date(Date.now() - 86_400_000))
    ? 'Yesterday'
    : `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return {
    main: label,
    sub: `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`,
  };
}

export default function DailyTracker({ users }) {
  const [date, setDate]         = useState(new Date());
  const [tasksMap, setTasksMap] = useState({});   // { userId: task[] }
  const [entries, setEntries]   = useState({});   // { userId: { taskId: bool } }
  const [activeUser, setActiveUser] = useState(users[0]?.id);
  const [loading, setLoading]   = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = toStr(date);
      const results = await Promise.all([
        ...users.map(u => getTasks(u.id)),
        ...users.map(u => getEntries(dateStr, u.id)),
      ]);
      const allTasksData = results.slice(0, users.length);
      const allEntries   = results.slice(users.length);

      const tMap = {};
      users.forEach((u, i) => { tMap[u.id] = allTasksData[i]; });
      setTasksMap(tMap);

      const map = {};
      users.forEach((u, i) => {
        map[u.id] = {};
        allEntries[i].forEach(e => { map[u.id][e.task_id] = e.completed === 1; });
      });
      setEntries(map);
    } finally {
      setLoading(false);
    }
  }, [date, users]);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleTask(userId, taskId) {
    const current = entries[userId]?.[taskId] ?? false;
    // Optimistic update
    setEntries(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [taskId]: !current },
    }));
    await saveEntry(userId, taskId, toStr(date), !current);
  }

  function progress(userId) {
    const userTasks = tasksMap[userId] ?? [];
    if (!userTasks.length) return 0;
    const done = userTasks.filter(t => entries[userId]?.[t.id]).length;
    return Math.round((done / userTasks.length) * 100);
  }

  const isToday  = toStr(date) === toStr(new Date());
  const isFuture = toStr(date) > toStr(new Date());
  const info     = labelFor(date);
  const user     = users.find(u => u.id === activeUser);

  function shiftDay(n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d);
  }

  return (
    <>
      {/* Date navigation */}
      <div className="date-nav">
        <button onClick={() => shiftDay(-1)}>‹</button>
        <div>
          <div className="date-label">{info.main}</div>
          <div className="date-sub">{info.sub}</div>
        </div>
        <button onClick={() => shiftDay(1)} disabled={isToday || isFuture}>›</button>
      </div>

      {/* Both users' progress at a glance */}
      <div className="users-progress">
        {users.map(u => (
          <div
            key={u.id}
            className="user-progress-card"
            style={{ borderTopColor: u.color }}
          >
            <div className="user-progress-name" style={{ color: u.color }}>{u.name}</div>
            <div className="user-progress-pct"  style={{ color: u.color }}>{progress(u.id)}%</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress(u.id)}%`, background: u.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* User selector */}
      <div className="tabs">
        {users.map(u => (
          <button
            key={u.id}
            className={activeUser === u.id ? 'active' : ''}
            style={activeUser === u.id ? { color: u.color } : {}}
            onClick={() => setActiveUser(u.id)}
          >
            {u.name}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="loading">Loading tasks…</div>
      ) : !(tasksMap[activeUser]?.length) ? (
        <div className="card empty-state">
          <h3>No tasks yet</h3>
          <p>Go to the Tasks tab to add your daily habits</p>
        </div>
      ) : (
        <div className="card">
          {(tasksMap[activeUser] ?? []).map(task => {
            const done = entries[activeUser]?.[task.id] ?? false;
            return (
              <div key={task.id} className="task-row">
                <span className={`task-name${done ? ' done' : ''}`}>{task.name}</span>
                <button
                  className="check-btn"
                  style={{
                    borderColor: user?.color,
                    background:  done ? user?.color : 'transparent',
                    color:       done ? 'white' : user?.color,
                  }}
                  onClick={() => !isFuture && toggleTask(activeUser, task.id)}
                  disabled={isFuture}
                  title={isFuture ? "Can't log future dates" : (done ? 'Mark incomplete' : 'Mark complete')}
                >
                  {done && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isFuture && (
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          You can only log today or past dates
        </p>
      )}
    </>
  );
}
