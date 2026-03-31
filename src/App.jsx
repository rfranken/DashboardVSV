import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import ConnectModal from './components/ConnectModal';
import DashboardPage from './pages/DashboardPage';
import ReadingsPage from './pages/ReadingsPage';
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

  const [defaultStartDate, setDefaultStartDate] = useState('');

  // Seed default start date on mount
  useEffect(() => {
    checkConnection().then((status) => {
      if (status?.default_start_date) {
        setDefaultStartDate(status.default_start_date);
      }
    });
  }, [checkConnection]);

  // Tab navigation class helper
  const tabClass = (isActive) =>
    `px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${
      isActive
        ? 'border-blue-600 text-blue-700 bg-blue-50'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  return (
    <div className="min-h-screen relative font-sans text-gray-900 bg-gray-50 p-4 md:p-8">
      {/* Secure Connection Pop-up works globally for both routes */}
      <ConnectModal
        isOpen={!isConnected}
        onConnect={() => setIsConnected(true)}
      />

      <div className="max-w-screen-2xl mx-auto">
        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1 border-b border-gray-200 mb-6">
          <NavLink to="/" end className={({ isActive }) => tabClass(isActive)}>
            Status
          </NavLink>
          <NavLink to="/readings" className={({ isActive }) => tabClass(isActive)}>
            Readings
          </NavLink>
        </nav>

        <Routes>
          <Route path="/" element={
            <DashboardPage 
              data={data}
              prevData={prevData}
              DOMAINS={DOMAINS}
              isRefreshing={isRefreshing}
              currentDomain={currentDomain}
              lastRefreshTime={lastRefreshTime}
              isConnected={isConnected}
              dbConfig={dbConfig}
              refresh={refresh}
              disconnect={disconnect}
              defaultStartDate={defaultStartDate}
            />
          } />
          <Route path="/readings" element={
            <ReadingsPage 
              data={data}
              prevData={prevData}
              DOMAINS={DOMAINS}
              isRefreshing={isRefreshing}
              currentDomain={currentDomain}
              lastRefreshTime={lastRefreshTime}
              isConnected={isConnected}
              dbConfig={dbConfig}
              refresh={refresh}
              disconnect={disconnect}
              defaultStartDate={defaultStartDate}
            />
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;
