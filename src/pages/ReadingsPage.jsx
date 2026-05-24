import React from 'react';
import { RefreshCw } from 'lucide-react';
import ReadingsTable from '../components/ReadingsTable';
import AcceptedReadingsTable from '../components/AcceptedReadingsTable';

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
  selectedDate,
  setSelectedDate,
  inputValToDdmmyyyy,
  error,
  clearError
}) {
  const todayInputVal = new Date().toISOString().split('T')[0];
  
  const formatDateToDdMmYyyy = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  };

  // Removed automatic initial fetch to follow user requirement

  // Removed automatic initial fetch to follow user requirement: 
  // "Only execute the queries in a page when the refresh button has been pressed."

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
              <span className="italic font-semibold">Readings received on or after:</span>
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

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-red-50 p-6 border-b border-red-100 flex items-start gap-4">
              <div className="flex-shrink-0 bg-red-100 p-2 rounded-full">
                <svg className="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 mt-0.5">
                <h3 className="text-lg font-bold text-red-900">Processing Interrupted</h3>
                <p className="mt-2 text-sm text-red-700 font-medium break-words">{error}</p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={clearError}
                className="bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid Workspace */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">VSV Events Failed (Uitval)</h2>
        </div>
        <div className="p-1">
          <ReadingsTable data={data} prevData={prevData} domains={DOMAINS} currentDomain={currentDomain} />
        </div>
      </div>

      {/* Parked Events Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">VSV Events Parked</h2>
        </div>
        <div className="p-1">
          <ReadingsTable data={data} prevData={prevData} domains={DOMAINS} currentDomain={currentDomain} dataPrefix="PARKED_" />
        </div>
      </div>

      {/* New Accepted Readings Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center flex-wrap gap-y-2">
            <span>Accepted Readings on or after {formatDateToDdMmYyyy(selectedDate)}</span>
          </h2>
        </div>
        <div className="p-1">
          <AcceptedReadingsTable data={data} domains={DOMAINS} currentDomain={currentDomain} />
        </div>
      </div>
      
    </div>
  );
}
