import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import DashboardTable from './components/DashboardTable';
import ConnectModal from './components/ConnectModal';
import { useDashboardRefresh } from './hooks/useDashboardRefresh';
import './index.css';

function App() {
  const { 
    data, 
    prevData,
    DOMAINS, 
    isRefreshing, 
    currentDomain, 
    lastRefreshTime, 
    isConnected,
    dbConfig,
    refresh,
    checkConnection,
    disconnect,
    setIsConnected
  } = useDashboardRefresh();

  // Seed date picker on mount by checking connection (also populates dbConfig)
  // The separate useEffect below handles this via checkConnection().then(...)


  // ---- Date picker state ----
  // Converts DDMMYYYY (backend) → YYYY-MM-DD (HTML input value)
  const ddmmyyyyToInputVal = (ddmmyyyy) => {
    const s = (ddmmyyyy || '').replace(/\D/g, '');
    if (s.length < 8) return '';
    return `${s.substring(4, 8)}-${s.substring(2, 4)}-${s.substring(0, 2)}`;
  };
  // Converts YYYY-MM-DD (HTML input value) → DDMMYYYY (backend)
  const inputValToDdmmyyyy = (val) => {
    if (!val) return '';
    const [y, m, d] = val.split('-');
    return `${d}${m}${y}`;
  };

  const todayInputVal = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState('');

  // Seed the date picker once the backend reports its default
  useEffect(() => {
    checkConnection().then((status) => {
      if (status?.default_start_date) {
        setSelectedDate(ddmmyyyyToInputVal(status.default_start_date));
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const MESSAGE_SUBTYPES = [
    'SmartReadingsNotification',
    'VolumeSeriesNotification',
    'MeterReadingExchange',
  ];
  const [messageSubtype, setMessageSubtype] = useState('SmartReadingsNotification');

  // Auto-refresh when finally connected
  const handleConnect = () => {
    setIsConnected(true);
    refresh(messageSubtype, inputValToDdmmyyyy(selectedDate));
  };

  return (
    <div className="min-h-screen relative font-sans text-gray-900 bg-gray-50 p-4 md:p-8">
      {/* Secure Connection Pop-up */}
      <ConnectModal
        isOpen={!isConnected}
        onConnect={handleConnect}
      />

      <div className="max-w-screen-2xl mx-auto space-y-6">
        
        {/* Header Layout per Requirements */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">DashboardVSV</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-500">Real-time status message monitoring</p>
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
                <span className="italic font-semibold">Messages older than:</span>
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
    </div>
  );
}

export default App;
