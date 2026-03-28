import { useState, useCallback } from 'react';

// Domain config constraints
const DOMAINS = [
  'DOM5', 'DOM6', 'DOM7', 'DOM8', 'DOM9', 'DOM10',
  'DOM11', 'DOM12', 'DOM13', 'DOM14', 'DOM15', 'DOM16'
];

export function useDashboardRefresh() {
  const [data, setData] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDomain, setCurrentDomain] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState('-');

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    
    // Starting sequential loop
    for (const domain of DOMAINS) {
      setCurrentDomain(domain);
      
      try {
        const response = await fetch(`http://localhost:8000/api/status?domain=${domain}`);
        
        if (!response.ok) {
           console.error(`Backend returned HTTP ${response.status} for ${domain}`);
           continue; // skip overriding old data if query fails
        }
        
        const newDataForDomain = await response.json();
        
        setData(prev => ({
          ...prev,
          [domain]: newDataForDomain
        }));
      } catch (error) {
        console.error(`Failed to fetch data for ${domain}:`, error);
      }
    }

    setCurrentDomain(null);
    setIsRefreshing(false);
    
    const now = new Date();
    setLastRefreshTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);

  }, [isRefreshing]);

  return {
    data,
    DOMAINS,
    isRefreshing,
    currentDomain,
    lastRefreshTime,
    refresh
  };
}
