import React from 'react';
import { RefreshCw } from 'lucide-react';
import DashboardTable from './components/DashboardTable';
import { useDashboardRefresh } from './hooks/useDashboardRefresh';
import './index.css';

function App() {
  const { data, DOMAINS, isRefreshing, currentDomain, lastRefreshTime, refresh } = useDashboardRefresh();

  return (
    <div className="min-h-screen relative font-sans text-gray-900 bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Layout per Requirements */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">DashboardVSV</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time status message monitoring</p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex flex-col items-end space-y-2">
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className={`inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isRefreshing 
                  ? 'bg-blue-400 text-white cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Last refresh: {lastRefreshTime}
            </span>
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
