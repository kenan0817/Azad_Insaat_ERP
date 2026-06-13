import React, { useState } from 'react';
import { Package, LogIn, KeyRound } from 'lucide-react';
import { User } from '../types';
import { verifyPassword } from '../services/auth';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  showDefaultHint?: boolean;
  defaultHint?: string;
}

const Login: React.FC<LoginProps> = ({ users, onLogin, showDefaultHint, defaultHint }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      setError('İstifadəçi adı və ya şifrə yanlışdır');
      setLoading(false);
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      setError('İstifadəçi adı və ya şifrə yanlışdır');
      setLoading(false);
      return;
    }

    onLogin(user);
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">İnşaat<span className="text-blue-400">ERP</span></h1>
          <p className="text-slate-400 mt-2">Tikinti materialları mağazası idarəetmə sistemi</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LogIn size={22} className="text-blue-600" />
            Sistemə Giriş
          </h2>

          {showDefaultHint && defaultHint && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
              <KeyRound size={16} className="mt-0.5 shrink-0" />
              <span>{defaultHint}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">İstifadəçi adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="admin"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Şifrə</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-500/30"
          >
            {loading ? 'Yoxlanılır...' : 'Daxil ol'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
