import { useState, useEffect } from 'react';
import { getUsers } from './api';
import DailyTracker from './components/DailyTracker';
import WeeklyView   from './components/WeeklyView';
import MonthlyView  from './components/MonthlyView';
import TaskManager  from './components/TaskManager';

const NAV = [
  {
    id: 'daily', label: 'Daily',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    id: 'weekly', label: 'Weekly',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    id: 'monthly', label: 'Monthly',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    id: 'tasks', label: 'Tasks',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
];

export default function App() {
  const [tab, setTab]       = useState('daily');
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    getUsers()
      .then(data => { setUsers(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <>
      <header className="app-header">
        <h1>🏠 Home Tracker</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {users.map(u => (
            <span
              key={u.id}
              className="user-badge"
              style={{ background: u.color + '22', color: u.color }}
            >
              {u.name}
            </span>
          ))}
        </div>
      </header>

      <main className="main-content">
        {loading && <div className="loading">Connecting to server…</div>}

        {error && (
          <div className="card" style={{ textAlign: 'center', color: '#dc2626', padding: 24 }}>
            <p style={{ fontWeight: 700 }}>Cannot reach the server</p>
            <p style={{ fontSize: '0.85rem', marginTop: 6 }}>
              Make sure the backend is running with <code>npm run dev</code>
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            {tab === 'daily'   && <DailyTracker users={users} />}
            {tab === 'weekly'  && <WeeklyView   users={users} />}
            {tab === 'monthly' && <MonthlyView  users={users} />}
            {tab === 'tasks'   && <TaskManager  users={users} />}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        {NAV.map(({ id, label, icon }) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {icon(tab === id)}
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
