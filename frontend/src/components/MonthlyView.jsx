import { useState, useEffect } from 'react';
import { getMonthlyProgress, getStats, getTasks } from '../api';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_HDR     = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function daysInMonth(y, m)    { return new Date(y, m + 1, 0).getDate(); }
function firstDayOffset(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

export default function MonthlyView({ users }) {
  const now = new Date();
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth());   // 0-indexed
  const [activeUser, setActiveUser] = useState(users[0]?.id);
  const [data, setData]         = useState([]);
  const [stats, setStats]       = useState(null);
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [monthData, statsData, tasksData] = await Promise.all([
        getMonthlyProgress(activeUser, year, month + 1),
        getStats(activeUser),
        getTasks(activeUser),
      ]);
      setData(monthData);
      setStats(statsData);
      setTasks(tasksData);
      setLoading(false);
    }
    load();
  }, [activeUser, year, month]);

  const user        = users.find(u => u.id === activeUser);
  const dataMap     = Object.fromEntries(data.map(d => [d.date, d]));
  const numDays     = daysInMonth(year, month);
  const offset      = firstDayOffset(year, month);
  const today       = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();
  const isCurrMonth = year === now.getFullYear() && month === now.getMonth();

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (isCurrMonth) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // Monthly stats
  const totalDone     = data.reduce((s, d) => s + Number(d.done), 0);
  const totalPossible = data.reduce((s, d) => s + Number(d.total), 0);
  const avgPct        = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  const perfectDays   = data.filter(d => tasks.length > 0 && Number(d.done) >= tasks.length).length;

  // Calendar cells
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push({ type: 'pad' });
  for (let day = 1; day <= numDays; day++) {
    const mm      = String(month + 1).padStart(2, '0');
    const dd      = String(day).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const d       = dataMap[dateStr];
    const future  = dateStr > today;
    const pct     = d && tasks.length > 0 ? Number(d.done) / tasks.length : 0;
    cells.push({ type: 'day', day, dateStr, d, future, pct });
  }

  return (
    <>
      {/* Month navigation */}
      <div className="date-nav">
        <button onClick={prevMonth}>‹</button>
        <div>
          <div className="date-label">{MONTH_NAMES[month]} {year}</div>
          <div className="date-sub">Monthly overview</div>
        </div>
        <button onClick={nextMonth} disabled={isCurrMonth}>›</button>
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

      {/* Stats */}
      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value" style={{ color: user?.color }}>🔥 {stats.streak}</div>
            <div className="stat-label">Day Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: user?.color }}>{avgPct}%</div>
            <div className="stat-label">Month avg</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: user?.color }}>{perfectDays}</div>
            <div className="stat-label">Perfect days</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: user?.color }}>{stats.totalCompleted}</div>
            <div className="stat-label">All-time ✓</div>
          </div>
        </div>
      )}

      {/* Calendar heatmap */}
      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="card" style={{ padding: 12 }}>
          <div className="calendar-header">
            {DAY_HDR.map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="calendar-grid">
            {cells.map((cell, idx) => {
              if (cell.type === 'pad') return <div key={`p${idx}`} />;
              const { day, dateStr, d, future, pct } = cell;
              const isToday = dateStr === today;

              let bg     = 'var(--border)';
              let color  = 'var(--text-muted)';
              let opacity = 1;

              if (future) {
                bg = 'transparent';
                opacity = 0.3;
              } else if (d) {
                bg      = user?.color ?? 'var(--user1)';
                opacity = 0.15 + pct * 0.85;
                color   = pct > 0.45 ? 'white' : 'var(--text-muted)';
              }

              return (
                <div
                  key={dateStr}
                  className="cal-day"
                  style={{
                    background: bg,
                    opacity,
                    color,
                    border: isToday ? `2px solid ${user?.color}` : 'none',
                  }}
                  title={d ? `${dateStr}: ${d.done}/${tasks.length} tasks` : dateStr}
                >
                  <span>{day}</span>
                  {d && !future && <span className="pct">{Math.round(pct * 100)}%</span>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 13, height: 13, borderRadius: 3, background: 'var(--border)' }} /> No data
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 13, height: 13, borderRadius: 3, background: user?.color, opacity: 0.3 }} /> Some
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 13, height: 13, borderRadius: 3, background: user?.color }} /> 100%
            </div>
          </div>
        </div>
      )}
    </>
  );
}
