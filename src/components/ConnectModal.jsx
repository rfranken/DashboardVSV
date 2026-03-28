import React, { useState } from 'react';
import { Database, Lock, AlertCircle, Loader2 } from 'lucide-react';

const ConnectModal = ({ isOpen, onConnect, dbUser, dsn }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
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
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Database User</p>
                <p className="text-sm font-bold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100 inline-block">{dbUser}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Environment</p>
                <p className="text-sm font-bold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100 inline-block">{dsn}</p>
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
