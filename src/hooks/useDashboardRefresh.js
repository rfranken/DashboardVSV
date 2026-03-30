import { useState, useCallback } from 'react';

// Domain config constraints
const DOMAINS = [
  'DOM3', 'DOM4', 'DOM5', 'DOM6', 'DOM7', 'DOM8', 'DOM9', 'DOM10',
  'DOM11', 'DOM12', 'DOM13', 'DOM14', 'DOM15', 'DOM16'
];

const getApiBase = () => {
  const { hostname } = window.location;
  // If we are on localhost/127.0.0.1, we assume the backend is on port 8000.
  // Otherwise, we leverage the current hostname but still target the configured port 8000.
  return `http://${hostname}:8000`;
};

export function useDashboardRefresh() {
  const [data, setData] = useState({});
  const [prevData, setPrevData] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDomain, setCurrentDomain] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState('-');
  const [startDate, setStartDate] = useState('-');
  const [isConnected, setIsConnected] = useState(false); 
  const [dbConfig, setDbConfig] = useState({ user: '-', dsn: '-' });

  const API_BASE = getApiBase();

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/connection-status`);
      if (response.ok) {
        const status = await response.json();
        setIsConnected(status.connected);
        setDbConfig({ user: status.user, dsn: status.dsn });
        return status;  // return full object so callers can read default_start_date etc.
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
    }
    return null;
  }, [API_BASE]);

  const disconnect = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/disconnect`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
    setIsConnected(false);
    setData({});
    setLastRefreshTime('-');
    setDbConfig({ user: '-', dsn: '-' });
  }, [API_BASE]);

  const refresh = useCallback(async (subtype = 'SmartReadingsNotification', startDate = '') => {
    if (isRefreshing) return;

    // Verify connection before starting sequence
    const status = await checkConnection();
    if (!status?.connected) {
      setIsConnected(false);
      return;
    }

    setIsRefreshing(true);
    
    // Starting sequential loop
    for (const domain of DOMAINS) {
      setCurrentDomain(domain);
      
      try {
        const url = new URL(`${API_BASE}/api/status`);
        url.searchParams.set('domain', domain);
        url.searchParams.set('subtype', subtype);
        if (startDate) url.searchParams.set('start_date', startDate);
        const response = await fetch(url.toString());
        
        if (response.status === 401) {
          setIsConnected(false);
          break;
        }

        if (!response.ok) {
           console.error(`Backend returned HTTP ${response.status} for ${domain}`);
           continue; 
        }
        
        const newDataForDomain = await response.json();
        
        // Update data
        setData(prev => {
          setPrevData(oldPrev => ({
            ...oldPrev,
            [domain]: prev[domain]
          }));
          return {
            ...prev,
            [domain]: newDataForDomain
          };
        });

        // Capture startDate if available
        if (newDataForDomain.start_date) {
          setStartDate(newDataForDomain.start_date);
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${domain}:`, error);
      }
    }

    setCurrentDomain(null);
    setIsRefreshing(false);
    
    const now = new Date();
    setLastRefreshTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);

  }, [isRefreshing, checkConnection, API_BASE]);

  return {
    data,
    prevData,
    DOMAINS,
    isRefreshing,
    currentDomain,
    lastRefreshTime,
    startDate,
    isConnected,
    dbConfig,
    setIsConnected,
    refresh,
    checkConnection,
    disconnect,
  };
}
