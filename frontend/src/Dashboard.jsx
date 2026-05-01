import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from './config';

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function formatError(error, fallback) {
  if (Array.isArray(error)) return error.map((item) => item.message).join(', ');
  return error || fallback;
}

export default function Dashboard({ token, user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [memberProjectId, setMemberProjectId] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskProject, setTaskProject] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setStatusMessage('');

    try {
      const endpoints = [
        fetch(`${API_BASE}/projects`, { headers: authHeaders(token) }),
        fetch(`${API_BASE}/tasks`, { headers: authHeaders(token) })
      ];

      if (user.role === 'admin') {
        endpoints.push(fetch(`${API_BASE}/users`, { headers: authHeaders(token) }));
      }

      const results = await Promise.all(endpoints);
      const [projectRes, taskRes, usersRes] = results;

      if (projectRes.ok) {
        setProjects(await projectRes.json());
      } else {
        const data = await projectRes.json();
        setStatusMessage(formatError(data.error, 'Unable to load projects'));
      }

      if (taskRes.ok) {
        setTasks(await taskRes.json());
      } else {
        const data = await taskRes.json();
        setStatusMessage(formatError(data.error, 'Unable to load tasks'));
      }

      if (user.role === 'admin') {
        if (usersRes?.ok) {
          setUsers(await usersRes.json());
        } else {
          const data = usersRes ? await usersRes.json() : {}; 
          setStatusMessage(formatError(data.error, 'Unable to load users'));
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      setStatusMessage('Unable to connect to the backend. Please start the server and reload.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const projectOptions = projects.map((project) => (
    <option key={project.id} value={project.id}>{project.name}</option>
  ));

  const userOptions = users.map((person) => (
    <option key={person.id} value={person.id}>{person.username} ({person.role})</option>
  ));

  const selectedProject = projects.find((project) => String(project.id) === String(taskProject));
  const assigneeOptions = (selectedProject?.members || []).map((person) => (
    <option key={person.id} value={person.id}>{person.username} ({person.membershipRole})</option>
  ));

  const taskCount = tasks.length;
  const openTasks = tasks.filter((task) => task.status !== 'done').length;
  const overdueCount = tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done').length;

  const visibleTasks = tasks;

  const handleProjectCreate = async (event) => {
    event.preventDefault();
    setStatusMessage('');

    try {
      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ name: newProjectName, description: newProjectDescription })
      });

      if (!response.ok) {
        const data = await response.json();
        setStatusMessage(formatError(data.error, 'Could not create project'));
        return;
      }

      setNewProjectName('');
      setNewProjectDescription('');
      fetchData();
      setStatusMessage('Project created successfully');
    } catch (err) {
      console.error('Project creation failed', err);
      setStatusMessage('Unable to create project. Please try again.');
    }
  };

  const handleMemberAdd = async (event) => {
    event.preventDefault();
    setStatusMessage('');

    if (!memberProjectId || !memberUserId) {
      setStatusMessage('Choose a project and user before adding team membership.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/projects/${memberProjectId}/team`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ userId: Number(memberUserId), membershipRole: memberRole })
      });

      if (!response.ok) {
        const data = await response.json();
        setStatusMessage(formatError(data.error, 'Could not add team member'));
        return;
      }

      setMemberProjectId('');
      setMemberUserId('');
      setMemberRole('member');
      fetchData();
      setStatusMessage('Team member added successfully');
    } catch (err) {
      console.error('Add team member failed', err);
      setStatusMessage('Unable to add team member. Please try again.');
    }
  };

  const handleTaskCreate = async (event) => {
    event.preventDefault();
    setStatusMessage('');

    if (!taskProject || !taskTitle) {
      setStatusMessage('Choose a project and task title.');
      return;
    }

    const payload = {
      projectId: Number(taskProject),
      title: taskTitle,
      description: taskDescription || undefined,
      dueDate: taskDueDate || undefined,
      status: 'todo'
    };

    if (user.role === 'admin' && taskAssigneeId) {
      payload.assigneeId = Number(taskAssigneeId);
    }

    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        setStatusMessage(formatError(data.error, 'Could not create task'));
        return;
      }

      setTaskTitle('');
      setTaskDescription('');
      setTaskProject('');
      setTaskDueDate('');
      setTaskAssigneeId('');
      fetchData();
      setStatusMessage('Task created successfully');
    } catch (err) {
      console.error('Task creation failed', err);
      setStatusMessage('Unable to create task. Please try again.');
    }
  };

  const updateTask = async (taskId, changes) => {
    setStatusMessage('');
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(changes)
      });

      if (!response.ok) {
        const data = await response.json();
        setStatusMessage(formatError(data.error, 'Could not update task'));
        return null;
      }

      const updatedTask = await response.json();
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updatedTask : task)));
      setStatusMessage('Task updated successfully');
      return updatedTask;
    } catch (err) {
      console.error('Task update failed', err);
      setStatusMessage('Unable to update task. Please try again.');
      return null;
    }
  };

  const handleStatusChange = (taskId, status) => updateTask(taskId, { status });

  const handleAssigneeChange = (taskId, assigneeId) => updateTask(taskId, { assigneeId: assigneeId ? Number(assigneeId) : null });

  const handleDeleteTask = async (taskId) => {
    setStatusMessage('');
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders(token)
      });

      if (!response.ok) {
        const data = await response.json();
        setStatusMessage(formatError(data.error, 'Could not delete task'));
        return;
      }

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      setStatusMessage('Task deleted');
    } catch (err) {
      console.error('Delete task failed', err);
      setStatusMessage('Unable to delete task. Please try again.');
    }
  };

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <h1>Team Task Manager</h1>
          <p>Signed in as <strong>{user.username}</strong> ({user.role})</p>
        </div>
        <button className="secondary" onClick={onLogout}>Logout</button>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <h3>Projects</h3>
          <p>{projects.length}</p>
        </div>
        <div className="summary-card">
          <h3>Tasks</h3>
          <p>{taskCount}</p>
        </div>
        <div className="summary-card">
          <h3>Open</h3>
          <p>{openTasks}</p>
        </div>
        <div className="summary-card">
          <h3>Overdue</h3>
          <p>{overdueCount}</p>
        </div>
      </div>

      {statusMessage && <div className="status-box">{statusMessage}</div>}
      {loading && <div className="status-box">Loading dashboard...</div>}

      <div className="grid-two-column">
        {user.role === 'admin' && (
          <section className="panel">
            <h2>Create Project</h2>
            <form className="grid-form" onSubmit={handleProjectCreate}>
              <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project name" required />
              <input value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} placeholder="Project description" />
              <button type="submit">Create Project</button>
            </form>
          </section>
        )}

        <section className="panel">
          <h2>Create Task</h2>
          <form className="grid-form" onSubmit={handleTaskCreate}>
            <select value={taskProject} onChange={(e) => {
              setTaskProject(e.target.value);
              setTaskAssigneeId('');
            }} required>
              <option value="">Select project</option>
              {projectOptions}
            </select>
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" required />
            <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Task description" rows="3" />
            <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
            {user.role === 'admin' && (
              <select value={taskAssigneeId} onChange={(e) => setTaskAssigneeId(e.target.value)}>
                <option value="">Assign to project member (optional)</option>
                {assigneeOptions}
              </select>
            )}
            <button type="submit">Create Task</button>
          </form>
        </section>
      </div>

      {user.role === 'admin' && (
        <section className="panel">
          <h2>Assign Project Team</h2>
          <form className="grid-form" onSubmit={handleMemberAdd}>
            <select value={memberProjectId} onChange={(e) => setMemberProjectId(e.target.value)} required>
              <option value="">Select project</option>
              {projectOptions}
            </select>
            <select value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} required>
              <option value="">Select user</option>
              {userOptions}
            </select>
            <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit">Add to Project</button>
          </form>
        </section>
      )}

      <div className="grid-two-column">
        <section className="panel">
          <h2>Projects</h2>
          {projects.length === 0 ? <p>No projects yet.</p> : (
            <div className="list-card">
              {projects.map((project) => (
                <div className="item-card project-card" key={project.id}>
                  <div className="task-head">
                    <strong>{project.name}</strong>
                    <span>{project.members?.length || 0} members</span>
                  </div>
                  <p>{project.description || 'No description provided.'}</p>
                  <div className="member-list">
                    {project.members?.length ? project.members.map((ansh) => (
                      <span key={ansh.id}>{ansh.username} ({ansh.membershipRole})</span>
                    )) : <small>2 members </small>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Tasks</h2>
          {visibleTasks.length === 0 ? <p>No tasks available.</p> : (
            <div className="list-card">
              {visibleTasks.map((task) => (
                <div className="item-card" key={task.id}>
                  <div className="task-head">
                    <strong>{task.title}</strong>
                    <span className={`status ${task.status}`}>{task.status}</span>
                  </div>
                  <p>{task.description || 'No description.'}</p>
                  <div>Project: {task.projectName}</div>
                  <div>Assignee: {task.assigneeName || 'Unassigned'}</div>
                  <div>Due: {task.dueDate || 'No due date'}</div>
                  <div className="task-actions">
                    <label>
                      Status
                      <select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)}>
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </label>
                    {user.role === 'admin' && (
                      <label>
                        Assignee
                        <select value={task.assigneeId || ''} onChange={(e) => handleAssigneeChange(task.id, e.target.value)}>
                          <option value="">Unassigned</option>
                          {(projects.find((project) => project.id === task.projectId)?.members || []).map((person) => (
                            <option key={person.id} value={person.id}>{person.username} ({person.membershipRole})</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {user.role === 'admin' && (
                      <button className="delete-button" type="button" onClick={() => handleDeleteTask(task.id)}>Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
