import React, { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import DashboardTable from './components/DashboardTable';
import ConnectModal from './components/ConnectModal';
import { useDashboardRefresh } from './hooks/useDashboardRefresh';
import './index.css';

function App() {
  const { 
    data, 
    DOMAINS, 
    isRefreshing, 
    currentDomain, 
    lastRefreshTime, 
    startDate, 
    isConnected,
    dbConfig,
    refresh,
    checkConnection,
    disconnect,
    setIsConnected
  } = useDashboardRefresh();

  // Auto-check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Helper to reformat DDMMYYYY to DD-MM-YYYY for Western Europe
  const formatEuropeDate = (dateStr) => {
    if (!dateStr || dateStr === '-' || dateStr.length < 8) return dateStr;
    const pureDate = dateStr.split(':')[0];
    if (pureDate.length !== 8) return dateStr;
    return `${pureDate.substring(0, 2)}-${pureDate.substring(2, 4)}-${pureDate.substring(4, 8)}`;
  };

  const displayStartDate = formatEuropeDate(startDate);

  // Auto-refresh when finally connected
  const handleConnect = () => {
    setIsConnected(true);
    refresh();
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
            <p className="text-sm text-gray-500 mt-1">Real-time status message monitoring</p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex flex-col items-end space-y-2">
            <button
              onClick={refresh}
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
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 italic">
                Messages are older than: <span className="font-bold">{displayStartDate}</span>
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                Last refresh: {lastRefreshTime}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid Workspace */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          <DashboardTable data={data} domains={DOMAINS} currentDomain={currentDomain} />
        </div>
        
      </div>
    </div>
  );
}

export default App;
