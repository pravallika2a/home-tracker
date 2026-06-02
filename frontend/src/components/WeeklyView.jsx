import { useState, useEffect } from 'react';
import { getWeeklyProgress, getTasks } from '../api';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getMonday(date) {
  const d   = new Date(date);
  const day = d.getDay();                       // 0 = Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function weekLabel(monday) {
  const sunday = addDays(monday, 6);
  const opts   = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', opts)}`;
}

export default function WeeklyView({ users }) {
  const [monday, setMonday]       = useState(() => getMonday(new Date()));
  const [tasksMap, setTasksMap]   = useState({});
  const [dataByUser, setDataByUser] = useState({});
  const [activeUser, setActiveUser] = useState(users[0]?.id);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const startStr = toStr(monday);
      const results = await Promise.all([
        ...users.map(u => getTasks(u.id)),
        ...users.map(u => getWeeklyProgress(u.id, startStr)),
      ]);
      const allTasksData = results.slice(0, users.length);
      const allProgress  = results.slice(users.length);

      const tMap = {};
      users.forEach((u, i) => { tMap[u.id] = allTasksData[i]; });
      setTasksMap(tMap);

      const map = {};
      users.forEach((u, i) => {
        map[u.id] = {};
        allProgress[i].forEach(row => {
          if (!map[u.id][row.date]) map[u.id][row.date] = {};
          map[u.id][row.date][row.task_id] = row.completed === 1;
        });
      });
      setDataByUser(map);
      setLoading(false);
    }
    load();
  }, [monday, users]);

  const today     = toStr(new Date());
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const user      = users.find(u => u.id === activeUser);
  const userData  = dataByUser[activeUser] ?? {};
  const tasks     = tasksMap[activeUser] ?? [];

  function dayCompletion(dateStr) {
    const dayData = userData[dateStr] ?? {};
    return {
      done:  tasks.filter(t => dayData[t.id]).length,
      total: tasks.length,
    };
  }

  const canGoNext = toStr(addDays(monday, 7)) <= today;

  return (
    <>
      {/* Week navigation */}
      <div className="date-nav">
        <button onClick={() => setMonday(prev => addDays(prev, -7))}>‹</button>
        <div>
          <div className="date-label" style={{ fontSize: '0.9rem' }}>{weekLabel(monday)}</div>
          <div className="date-sub">Week view</div>
        </div>
        <button onClick={() => setMonday(prev => addDays(prev, 7))} disabled={!canGoNext}>›</button>
      </div>

      {/* User tabs */}
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

      {/* Day summary bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {weekDates.map((d, idx) => {
          const ds      = toStr(d);
          const { done, total } = dayCompletion(ds);
          const pct     = total > 0 ? done / total : 0;
          const future  = ds > today;
          const isToday = ds === today;
          return (
            <div
              key={ds}
              style={{
                flex: 1,
                background: future
                  ? 'transparent'
                  : pct === 0
                  ? 'var(--border)'
                  : user?.color,
                opacity: future ? 0.3 : pct > 0 ? 0.25 + pct * 0.75 : 1,
                border: isToday
                  ? `2px solid ${user?.color}`
                  : future
                  ? '1px dashed var(--border)'
                  : 'none',
                borderRadius: 6,
                padding: '6px 0',
                textAlign: 'center',
                fontSize: '0.62rem',
                fontWeight: 700,
                color: pct > 0.45 && !future ? 'white' : 'var(--text-muted)',
              }}
            >
              <div>{DAY_LABELS[idx]}</div>
              {!future && <div>{done}/{total}</div>}
            </div>
          );
        })}
      </div>

      {/* Per-task grid */}
      {loading ? (
        <div className="loading">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="card empty-state"><h3>No tasks yet</h3></div>
      ) : (
        <div className="card" style={{ padding: 12, overflowX: 'auto' }}>
          <table className="week-table">
            <thead>
              <tr>
                <th className="task-col">Task</th>
                {weekDates.map((d, idx) => {
                  const ds      = toStr(d);
                  const isToday = ds === today;
                  return (
                    <th key={ds} style={{ color: isToday ? user?.color : undefined }}>
                      {DAY_LABELS[idx]}<br />
                      <span style={{ fontWeight: 400, fontSize: '0.62rem' }}>{d.getDate()}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id}>
                  <td className="task-col" title={task.name}>{task.name}</td>
                  {weekDates.map(d => {
                    const ds     = toStr(d);
                    const future = ds > today;
                    const done   = userData[ds]?.[task.id] ?? false;
                    return (
                      <td key={ds}>
                        <div
                          className={`week-cell ${future ? 'future' : done ? 'done' : 'empty'}`}
                          style={done ? { background: user?.color } : {}}
                        >
                          {done && '✓'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
