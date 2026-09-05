import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data =
        mode === 'login'
          ? await api.login(username, password)
          : await api.register(username, password, displayName);
      localStorage.setItem('token', data.token);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>

        <label>
          Usuário
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ex: maria"
            required
          />
        </label>

        {mode === 'register' && (
          <label>
            Nome de exibição
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="ex: Maria"
              required
            />
          </label>
        )}

        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
            required
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <button
          type="button"
          className="link-button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  );
}
