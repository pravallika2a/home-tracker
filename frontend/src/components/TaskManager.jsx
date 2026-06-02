import { useState, useEffect } from 'react';
import { getTasks, addTask, deleteTask } from '../api';

export default function TaskManager({ users }) {
  const [tasks, setTasks]         = useState([]);
  const [newName, setNewName]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeUser, setActiveUser] = useState(null);

  const userId = activeUser ?? users[0]?.id;
  const user   = users.find(u => u.id === userId);

  async function loadTasks() {
    setLoading(true);
    const data = await getTasks(userId);
    setTasks(data);
    setLoading(false);
  }

  useEffect(() => { if (userId != null) loadTasks(); }, [userId]);

  async function handleAdd(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError('');
    try {
      await addTask(name, userId);
      setNewName('');
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Remove "${name}"?\n\nAll logged entries for this task will also be deleted.`)) return;
    await deleteTask(id);
    await loadTasks();
  }

  return (
    <>
      {/* User tabs */}
      <div className="tabs">
        {users.map(u => (
          <button
            key={u.id}
            className={userId === u.id ? 'active' : ''}
            style={userId === u.id ? { color: u.color } : {}}
            onClick={() => setActiveUser(u.id)}
          >
            {u.name}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Add habit for {user?.name}</div>
        <form onSubmit={handleAdd} className="input-row">
          <input
            className="input"
            type="text"
            placeholder="e.g. Read for 20 mins"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            maxLength={80}
          />
          <button type="submit" className="btn btn-primary">Add</button>
        </form>
        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: 4 }}>{error}</p>
        )}
      </div>

      <div className="card">
        <div className="card-title">{user?.name}'s habits ({tasks.length})</div>
        {loading ? (
          <div className="loading">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <h3>No tasks yet</h3>
            <p>Add your first daily habit above!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="task-row">
              <span className="task-name">
                {task.name}
                {task.user_id === null && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>shared</span>
                )}
              </span>
              <button
                className="btn btn-danger"
                style={{ padding: '5px 10px', fontSize: '0.8rem', flexShrink: 0 }}
                onClick={() => handleDelete(task.id, task.name)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div
        className="tip-card"
        style={{ background: 'linear-gradient(135deg,#ede9fe,#fce7f3)', color: '#6b21a8' }}
      >
        💡 <strong>Tip:</strong> Tasks you add here belong only to {user?.name}. Tasks marked <em>shared</em> appear for both.
      </div>
    </>
  );
}
