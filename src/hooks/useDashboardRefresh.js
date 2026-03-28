import { useState, useCallback } from 'react';

// Domain config constraints
const DOMAINS = [
  'DOM3', 'DOM4', 'DOM5', 'DOM6', 'DOM7', 'DOM8', 'DOM9', 'DOM10',
  'DOM11', 'DOM12', 'DOM13', 'DOM14', 'DOM15', 'DOM16'
];

export function useDashboardRefresh() {
  const [data, setData] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDomain, setCurrentDomain] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState('-');
  const [startDate, setStartDate] = useState('-');
  const [isConnected, setIsConnected] = useState(false); 
  const [dbConfig, setDbConfig] = useState({ user: '-', dsn: '-' });

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/connection-status');
      if (response.ok) {
        const status = await response.json();
        setIsConnected(status.connected);
        setDbConfig({ user: status.user, dsn: status.dsn });
        return status.connected;
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
    }
    return false;
  }, []);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    // Verify connection before starting sequence
    const connected = await checkConnection();
    if (!connected) {
      setIsConnected(false);
      return;
    }

    setIsRefreshing(true);
    
    // Starting sequential loop
    for (const domain of DOMAINS) {
      setCurrentDomain(domain);
      
      try {
        const response = await fetch(`http://localhost:8000/api/status?domain=${domain}`);
        
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
        setData(prev => ({
          ...prev,
          [domain]: newDataForDomain
        }));

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

  }, [isRefreshing, checkConnection]);

  return {
    data,
    DOMAINS,
    isRefreshing,
    currentDomain,
    lastRefreshTime,
    startDate,
    isConnected,
    dbConfig,
    setIsConnected,
    refresh,
    checkConnection
  };
}
