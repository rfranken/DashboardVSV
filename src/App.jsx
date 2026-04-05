import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import ConnectModal from './components/ConnectModal';
import DashboardPage from './pages/DashboardPage';
import ReadingsPage from './pages/ReadingsPage';
import { useDashboardRefresh } from './hooks/useDashboardRefresh';
import './index.css';

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
  const [readingDate, setReadingDate] = useState('');
  const [sharedDate, setSharedDate] = useState('');

  // Seed default start date and reading date on mount
  useEffect(() => {
    checkConnection().then((status) => {
      if (status?.default_start_date) {
        setDefaultStartDate(status.default_start_date);
        setSharedDate(ddmmyyyyToInputVal(status.default_start_date));
      }
      if (status?.reading_date) {
        setReadingDate(status.reading_date);
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
              defaultStartDate={defaultStartDate}
              selectedDate={sharedDate}
              setSelectedDate={setSharedDate}
              inputValToDdmmyyyy={inputValToDdmmyyyy}
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
              readingDate={readingDate}
              selectedDate={sharedDate}
              setSelectedDate={setSharedDate}
              inputValToDdmmyyyy={inputValToDdmmyyyy}
              ddmmyyyyToInputVal={ddmmyyyyToInputVal}
            />
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;
