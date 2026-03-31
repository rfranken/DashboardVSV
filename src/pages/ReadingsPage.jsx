import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import ReadingsTable from '../components/ReadingsTable';

// Helper functions for date formatting
const ddmmyyyyToInputVal = (ddmmyyyy) => {
  const s = (ddmmyyyy || '').replace(/\D/g, '');
  if (s.length < 8) return '';
  return `${s.substring(4, 8)}-${s.substring(2, 4)}-${s.substring(0, 2)}`;
};

const inputValToDdmmyyyy = (val) => {
  if (!val) return '';
  const [y, m, d] = val.split('-');
  return `${d}${m}${y}`;
};

export default function ReadingsPage({
  data,
  prevData,
  DOMAINS,
  isRefreshing,
  currentDomain,
  lastRefreshTime,
  isConnected,
  dbConfig,
  refresh,
  disconnect,
  defaultStartDate
}) {
  const todayInputVal = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState('');
  const [hasInitialRefresh, setHasInitialRefresh] = useState(false);

  // Seed default start date when available
  useEffect(() => {
    if (defaultStartDate) {
      setSelectedDate(ddmmyyyyToInputVal(defaultStartDate));
    }
  }, [defaultStartDate]);

  // Initial fetch when connection is ready
  useEffect(() => {
    if (isConnected && !hasInitialRefresh) {
      setHasInitialRefresh(true);
      // Wait a moment for date state to settle
      setTimeout(() => {
        // We pass null for subtype to satisfy the signature but trigger '/api/readings' via the third argument
        refresh(null, inputValToDdmmyyyy(selectedDate), 'readings');
      }, 0);
    }
  }, [isConnected, hasInitialRefresh, refresh, selectedDate]);

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      {/* Header Layout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard VSV: Readings</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">Real-time Smart Meter Readings Monitoring</p>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-col items-end space-y-2">
          <button
            onClick={() => refresh(null, inputValToDdmmyyyy(selectedDate), 'readings')}
            disabled={isRefreshing || !isConnected}
            className={`inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isRefreshing 
                ? 'bg-blue-400 text-white cursor-not-allowed' 
                : (isConnected ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-400 text-white cursor-not-allowed')
            }`}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center space-x-3 text-xs font-medium text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">
              Connected as: <span className="font-bold uppercase">{dbConfig.user}</span>
            </span>
            <span className="bg-gray-100 px-2 py-1 rounded">
              Database: <span className="font-bold uppercase">{dbConfig.dsn}</span>
            </span>
            {isConnected && (
              <button
                onClick={disconnect}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-1 rounded text-xs font-semibold transition-colors"
                title="Disconnect from Oracle database"
              >
                Log Out
              </button>
            )}
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 flex items-center gap-1.5">
              <span className="italic font-semibold">Readings older than:</span>
              <input
                id="start-date-picker"
                type="date"
                value={selectedDate}
                max={todayInputVal}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold text-blue-700 bg-transparent border-none outline-none cursor-pointer"
              />
            </span>
            <span className="bg-gray-100 px-2 py-1 rounded">
              Last refresh: {lastRefreshTime}
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard Grid Workspace */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <ReadingsTable data={data} prevData={prevData} domains={DOMAINS} currentDomain={currentDomain} />
      </div>
      
    </div>
  );
}
