import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import DashboardTable from '../components/DashboardTable';

const MESSAGE_SUBTYPES = [
  'SmartReadingsNotification',
  'VolumeSeriesNotification',
  'MeterReadingExchange',
];

export default function DashboardPage({
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
  defaultStartDate,
  selectedDate,
  setSelectedDate,
  inputValToDdmmyyyy
}) {
  const todayInputVal = new Date().toISOString().split('T')[0];
  const [messageSubtype, setMessageSubtype] = useState('SmartReadingsNotification');

  // Removed automatic initial fetch to follow user requirement

  // Removed automatic initial fetch to follow user requirement: 
  // "Only execute the queries in a page when the refresh button has been pressed."

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      {/* Header Layout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">DashboardVSV</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">Real-time message monitoring</p>
            <div className="flex items-center gap-1.5">
              <label htmlFor="subtype-select" className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                Message Subtype
              </label>
              <select
                id="subtype-select"
                value={messageSubtype}
                onChange={(e) => setMessageSubtype(e.target.value)}
                className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {MESSAGE_SUBTYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-col items-end space-y-2">
          <button
            onClick={() => refresh(messageSubtype, inputValToDdmmyyyy(selectedDate))}
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
              <span className="italic font-semibold">Messages received after:</span>
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
        <DashboardTable data={data} prevData={prevData} domains={DOMAINS} currentDomain={currentDomain} />
      </div>
      
    </div>
  );
}
