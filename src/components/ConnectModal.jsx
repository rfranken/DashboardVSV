import React, { useState } from 'react';
import { Database, Lock, AlertCircle, Loader2, ChevronDown } from 'lucide-react';

// Environment → Database User mapping
const ENV_CONFIG = {
  DSFATN2: { label: 'DSFATN2 (Default)', dbUser: 'FATN2_GEN_FRANKEN' },
  DSACT2:  { label: 'DSACT2',            dbUser: 'ACT2_GEN_FRANKENR'  },
  DSPRD:   { label: 'DSPRD',             dbUser: 'PRD_FRANKENR'        },
};

const ConnectModal = ({ isOpen, onConnect }) => {
  const [selectedEnv, setSelectedEnv] = useState('DSFATN2');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const dbUser = ENV_CONFIG[selectedEnv].dbUser;

  const handleEnvChange = (e) => {
    setSelectedEnv(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiBase = `http://${window.location.hostname}:8000`;
      const response = await fetch(`${apiBase}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, dsn: selectedEnv, db_user: dbUser }),
      });

      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.detail || 'Connection failed');
      }

      onConnect();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-blue-600 p-6 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Database className="h-6 w-6 font-bold" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Database Authentication</h2>
              <p className="text-blue-100 text-xs mt-0.5">Secure connection required to fetch data</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-4 mb-8">
            {/* Environment (left) + Database User (right) */}
            <div className="flex gap-4 items-start">

              {/* Environment Dropdown — LEFT */}
              <div className="flex-1">
                <label
                  htmlFor="env-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1"
                >
                  Environment
                </label>
                <div className="relative">
                  <select
                    id="env-select"
                    value={selectedEnv}
                    onChange={handleEnvChange}
                    className="w-full appearance-none text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    {Object.entries(ENV_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Database User — RIGHT (auto-filled, read-only) */}
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Database User
                </p>
                <p className="text-sm font-bold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100 inline-block w-full truncate">
                  {dbUser}
                </p>
              </div>

            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400"
                  placeholder="Enter your Oracle password"
                  autoFocus
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm animate-in shake duration-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-[1.01] active:scale-95 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Connecting to Oracle...</span>
                </>
              ) : (
                <span>Initialize Connection</span>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-gray-400 mt-6 px-4 leading-relaxed font-medium">
            Note: Passwords are not stored in the application environment and must be re-entered if the backend restarts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectModal;
