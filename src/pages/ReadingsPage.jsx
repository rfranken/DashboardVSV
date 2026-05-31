import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import ReadingsTable from '../components/ReadingsTable';
import AcceptedReadingsTable from '../components/AcceptedReadingsTable';

export default function ReadingsPage({
  data,
  prevData,
  DOMAINS,
  isRefreshing,
  currentDomain,
  lastRefreshTime,
  isConnected,
  dbConfig,
  refresh,
  disconnect,
  selectedDate,
  setSelectedDate,
  inputValToDdmmyyyy,
  error,
  clearError
}) {
  const todayInputVal = new Date().toISOString().split('T')[0];
  
  // Details Modal states for Accepted Readings
  const [activeAcceptedCell, setActiveAcceptedCell] = useState(null);
  const [acceptedDetails, setAcceptedDetails] = useState([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [searchEan, setSearchEan] = useState('');
  const [searchDossier, setSearchDossier] = useState('');
  const [modalDebug, setModalDebug] = useState(null);

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveAcceptedCell(null);
      }
    };
    if (activeAcceptedCell) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAcceptedCell]);

  const handleAcceptedCellClick = async (domain, processId, count) => {
    setActiveAcceptedCell({ domain, processId, count });
    setAcceptedDetails([]);
    setIsModalLoading(true);
    setModalError(null);
    setSearchEan('');
    setSearchDossier('');
    setModalDebug(null);

    try {
      const { hostname } = window.location;
      const apiBase = `http://${hostname}:8000`;
      const url = new URL(`${apiBase}/api/accepted-readings-details`);
      url.searchParams.set('domain', domain);
      url.searchParams.set('process_id', processId);
      url.searchParams.set('start_date', inputValToDdmmyyyy(selectedDate));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch accepted readings details: ${response.statusText}`);
      }
      const result = await response.json();
      setAcceptedDetails(result.readings || []);
      if (result._debug) {
        setModalDebug(result._debug);
      }
    } catch (err) {
      console.error(err);
      setModalError(err.message || String(err));
    } finally {
      setIsModalLoading(false);
    }
  };

  // Helper to format date-time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return dateStr;
    }
  };

  // Filter readings based on search terms
  const filteredReadings = acceptedDetails.filter((r) => {
    const matchEan = (r.MP_EAN_CODE || '').toLowerCase().includes(searchEan.trim().toLowerCase());
    const matchDossier = (r.TRANSACTIEDOSSIER || '').toLowerCase().includes(searchDossier.trim().toLowerCase());
    return matchEan && matchDossier;
  });
  
  const formatDateToDdMmYyyy = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  };

  // Removed automatic initial fetch to follow user requirement

  // Removed automatic initial fetch to follow user requirement: 
  // "Only execute the queries in a page when the refresh button has been pressed."

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      {/* Header Layout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard VSV: Readings</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">Real-time Smart Meter Readings Monitoring</p>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-col items-end space-y-2">
          <button
            onClick={() => refresh(null, inputValToDdmmyyyy(selectedDate), 'readings')}
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
              <span className="italic font-semibold">Readings received on or after:</span>
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

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-red-50 p-6 border-b border-red-100 flex items-start gap-4">
              <div className="flex-shrink-0 bg-red-100 p-2 rounded-full">
                <svg className="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 mt-0.5">
                <h3 className="text-lg font-bold text-red-900">Processing Interrupted</h3>
                <p className="mt-2 text-sm text-red-700 font-medium break-words">{error}</p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={clearError}
                className="bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid Workspace */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">VSV Events Failed (Uitval)</h2>
        </div>
        <div className="p-1">
          <ReadingsTable data={data} prevData={prevData} domains={DOMAINS} currentDomain={currentDomain} />
        </div>
      </div>

      {/* Parked Events Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">VSV Events Parked</h2>
        </div>
        <div className="p-1">
          <ReadingsTable data={data} prevData={prevData} domains={DOMAINS} currentDomain={currentDomain} dataPrefix="PARKED_" />
        </div>
      </div>

      {/* New Accepted Readings Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center flex-wrap gap-y-2">
            <span>Accepted Readings on or after {formatDateToDdMmYyyy(selectedDate)}</span>
          </h2>
        </div>
        <div className="p-1">
          <AcceptedReadingsTable data={data} domains={DOMAINS} currentDomain={currentDomain} onCellClick={handleAcceptedCellClick} />
        </div>
      </div>

      {/* Accepted Readings Details Modal */}
      {activeAcceptedCell && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6"
          onClick={() => setActiveAcceptedCell(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-6xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>Details voor {activeAcceptedCell.domain}</span>
                  <span className="text-sm font-medium px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    ProcesID: {activeAcceptedCell.processId} ({activeAcceptedCell.count})
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Ontvangen op of na: <span className="font-semibold">{selectedDate.split('-').reverse().join('-')}</span>
                </p>
              </div>
              <button 
                onClick={() => setActiveAcceptedCell(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sub-Header: Search bars */}
            {!isModalLoading && !modalError && acceptedDetails.length > 0 && (
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/30 flex gap-4">
                <div className="flex-1">
                  <label htmlFor="search-ean" className="block text-xs font-semibold text-gray-500 uppercase mb-1">EAN-code</label>
                  <input
                    id="search-ean"
                    type="text"
                    placeholder="Zoek op EAN-code..."
                    value={searchEan}
                    onChange={(e) => setSearchEan(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="search-dossier" className="block text-xs font-semibold text-gray-500 uppercase mb-1">Transactiedossier</label>
                  <input
                    id="search-dossier"
                    type="text"
                    placeholder="Zoek op transactiedossier..."
                    value={searchDossier}
                    onChange={(e) => setSearchDossier(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[300px]">
              {isModalLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-500 font-medium">Laden van details...</span>
                </div>
              ) : modalError ? (
                <div className="bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-start gap-3 my-4">
                  <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-bold">Fout bij ophalen details</h4>
                    <p className="text-sm mt-1">{modalError}</p>
                  </div>
                </div>
              ) : filteredReadings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <svg className="w-12 h-12 stroke-current mb-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Geen records gevonden.</span>
                </div>
              ) : (
                <div className="shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          EAN-code
                        </th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                          Telwerk
                        </th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                          Stand
                        </th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">
                          Opnamedatum
                        </th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Transactiedossier
                        </th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-28">
                          ProcesID
                        </th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-28">
                          Herkomst
                        </th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">
                          Ontvangen op
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredReadings.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900 select-all whitespace-nowrap">
                            {row.MP_EAN_CODE}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                            {row.TELWERK}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 font-medium tabular-nums whitespace-nowrap">
                            {row.STAND}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                            {formatDateTime(row.OPNAMEDATUM)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 select-all break-all">
                            {row.TRANSACTIEDOSSIER}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                            {row.PROCESID}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                            {row.HERKOMST}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                            {formatDateTime(row.ONTVANGEN_OP)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500">
                  {filteredReadings.length !== acceptedDetails.length 
                    ? `Getoond: ${filteredReadings.length} van ${acceptedDetails.length} records`
                    : `Totaal: ${acceptedDetails.length} records`
                  }
                </span>
                <button
                  onClick={() => setActiveAcceptedCell(null)}
                  className="bg-white hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm transition-colors"
                >
                  Sluiten
                </button>
              </div>

              {/* Debug SQL details inside Modal */}
              {modalDebug && modalDebug.sql && (
                <details className="mt-2 text-xs border border-blue-100 bg-blue-50/50 rounded-lg overflow-hidden">
                  <summary className="cursor-pointer font-bold text-blue-700 px-3 py-1.5 hover:bg-blue-50 select-none">
                    Toon SQL Query (Debug Mode)
                  </summary>
                  <div className="p-3 border-t border-blue-100 font-mono text-[10px] text-blue-900 bg-white overflow-x-auto whitespace-pre">
                    {modalDebug.sql}
                  </div>
                </details>
              )}
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}
