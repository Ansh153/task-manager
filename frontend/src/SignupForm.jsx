import { useState } from 'react';
import { API_BASE } from './config';

const API_URL = `${API_BASE}/auth`;

function formatError(error) {
  if (Array.isArray(error)) return error.map((item) => item.message).join(', ');
  return error || 'Signup failed';
}

export default function SignupForm({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(formatError(data.error));
        return;
      }

      onSuccess(data);
    } catch (err) {
      console.error('Signup failed', err);
      setError('Unable to connect to the server. Please try again.');
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Sign Up</h2>
      <label>Username</label>
      <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
      <label>Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
      {error && <div className="error">{error}</div>}
      <button type="submit">Create account</button>
    </form>
  );
}
