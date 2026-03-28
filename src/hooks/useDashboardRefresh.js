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

  // Generate randomized dummy table response for a single domain
  const generateDummyResponse = (domain) => {
    // Array order: A, G, PG, VW (VM), WV, ON
    const id = domain.replace('DOM', '');
    const dataRow = {
      // Create random counts, occasionally zero to test black color requirement
      [`A${id}`]: Math.random() > 0.8 ? 0 : Math.floor(Math.random() * 50) + 1,
      [`G${id}`]: Math.random() > 0.8 ? 0 : Math.floor(Math.random() * 200) + 1,
      [`PG${id}`]: Math.random() > 0.8 ? 0 : Math.floor(Math.random() * 50) + 1,
      [`VM${id}`]: Math.random() > 0.8 ? 0 : Math.floor(Math.random() * 20) + 1,
      [`WV${id}`]: Math.random() > 0.8 ? 0 : Math.floor(Math.random() * 80) + 1,
      [`ON${id}`]: Math.random() > 0.8 ? 0 : Math.floor(Math.random() * 5) + 1,
    };
    return dataRow;
  };

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    let newDataTemp = {}; // Clear previous data table while fetching? Or keep old? Let's keep old data but update specifically.
    
    // Starting sequential loop
    for (const domain of DOMAINS) {
      setCurrentDomain(domain);
      
      // Simulate network wait
      await new Promise(res => setTimeout(res, 800));

      const newDataForDomain = generateDummyResponse(domain);
      
      setData(prev => ({
        ...prev,
        [domain]: newDataForDomain
      }));
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
