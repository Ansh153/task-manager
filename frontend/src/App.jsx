import { useEffect, useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import Dashboard from './Dashboard';

const STORAGE_KEY = 'team-task-manager-auth';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [mode, setMode] = useState('login');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.token && saved?.user) {
      setToken(saved.token);
      setUser(saved.user);
    }
  }, []);

  const handleAuth = (data) => {
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!user) {
    return (
      <div className="app-shell">
        <div className="card auth-card">
          {mode === 'login' ? (
            <LoginForm onSuccess={handleAuth} />
          ) : (
            <SignupForm onSuccess={handleAuth} />
          )}
          <button className="toggle-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard token={token} user={user} onLogout={logout} />;
}

export default App;
