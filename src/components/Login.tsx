import React, { useState } from 'react';
import { login } from '../api';
import { C } from '../lib/constants';

export const Login = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(username, password);
      onLogin(data.access_token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surfaceAlt }}>
      <form onSubmit={handleSubmit} style={{ background: C.surface, padding: 40, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', width: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8, color: C.textPrimary }}>Sign In</h2>
        {error && <div style={{ color: C.red, fontSize: 13, background: C.redLight, padding: '8px 12px', borderRadius: 6 }}>{error}</div>}
        <input 
          placeholder="Username" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
          style={{ padding: '10px 12px', borderRadius: 6, border: `1px solid ${C.border}`, fontFamily: "'Inter', sans-serif", fontSize: 14, outline: 'none' }} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          style={{ padding: '10px 12px', borderRadius: 6, border: `1px solid ${C.border}`, fontFamily: "'Inter', sans-serif", fontSize: 14, outline: 'none' }} 
        />
        <button 
          type="submit" 
          disabled={loading} 
          style={{ background: C.black, color: '#fff', padding: '12px', borderRadius: 6, border: 'none', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", marginTop: 8, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};
