import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import ConnectModal from './components/ConnectModal';
import DashboardPage from './pages/DashboardPage';
import ReadingsPage from './pages/ReadingsPage';
import { useDashboardRefresh } from './hooks/useDashboardRefresh';
import './index.css';

// Helper functions for date formatting
const inputValToDdmmyyyy = (val) => {
  if (!val) return '';
  const [y, m, d] = val.split('-');
  return `${d}${m}${y}`;
};

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
    setIsConnected,
    error,
    clearError,
  } = useDashboardRefresh();

  const [sharedDate, setSharedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
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
        onConnect={() => {
          // Re-seed date state on every successful login (covers logout → re-login)
          checkConnection().then(() => {
            setIsConnected(true);
          });
        }}
      />

      <div className="max-w-screen-2xl mx-auto">
        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1 border-b border-gray-200 mb-6">
          <NavLink to="/" end className={({ isActive }) => tabClass(isActive)}>
            Messages
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
              selectedDate={sharedDate}
              setSelectedDate={setSharedDate}
              inputValToDdmmyyyy={inputValToDdmmyyyy}
              error={error}
              clearError={clearError}
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
              selectedDate={sharedDate}
              setSelectedDate={setSharedDate}
              inputValToDdmmyyyy={inputValToDdmmyyyy}
              error={error}
              clearError={clearError}
            />
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;
