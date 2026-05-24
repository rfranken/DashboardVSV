import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import DashboardTable from '../components/DashboardTable';

const MESSAGE_SUBTYPES = [
  'SmartReadingsNotification',
  'VolumeSeriesNotification',
  'MeterReadingExchange',
];

export default function DashboardPage({
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
  const [messageSubtype, setMessageSubtype] = useState('SmartReadingsNotification');

  // Details Modal states
  const [activeCell, setActiveCell] = useState(null);
  const [modalMessages, setModalMessages] = useState([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalDebug, setModalDebug] = useState(null);

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveCell(null);
      }
    };
    if (activeCell) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell]);

  // Fetch handler for cell messages detail
  const handleCellClick = async (domain, statusPrefix, statusLabel, count) => {
    setActiveCell({ domain, statusPrefix, statusLabel, count });
    setModalMessages([]);
    setIsModalLoading(true);
    setModalError(null);
    setSearchTerm('');
    setModalDebug(null);

    try {
      const { hostname } = window.location;
      const apiBase = `http://${hostname}:8000`;
      const url = new URL(`${apiBase}/api/message-details`);
      url.searchParams.set('domain', domain);
      url.searchParams.set('status_prefix', statusPrefix);
      url.searchParams.set('subtype', messageSubtype);
      url.searchParams.set('start_date', inputValToDdmmyyyy(selectedDate));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch message details: ${response.statusText}`);
      }
      const result = await response.json();
      setModalMessages(result.messages || []);
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

  // Filter messages based on search term
  const filteredMessages = modalMessages.filter((msg) =>
    (msg.BESTANDSNAAM || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      {/* Header Layout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard VSV: Messages</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-gray-500">Real-time message monitoring</p>
            <div className="flex items-center gap-1.5">
              <label htmlFor="subtype-select" className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                Message Subtype
              </label>
              <select
                id="subtype-select"
                value={messageSubtype}
                onChange={(e) => setMessageSubtype(e.target.value)}
                className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {MESSAGE_SUBTYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-col items-end space-y-2">
          <button
            onClick={() => refresh(messageSubtype, inputValToDdmmyyyy(selectedDate))}
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
              <span className="italic font-semibold">Messages received on or after:</span>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <DashboardTable 
          data={data} 
          prevData={prevData} 
          domains={DOMAINS} 
          currentDomain={currentDomain} 
          onCellClick={handleCellClick}
        />
      </div>

      {/* Details Modal */}
      {activeCell && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6"
          onClick={() => setActiveCell(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>Berichten voor {activeCell.domain}</span>
                  <span className="text-sm font-medium px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    Status: {activeCell.statusLabel} ({activeCell.count})
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Type: <span className="font-semibold">{messageSubtype}</span> | Ontvangen op of na: <span className="font-semibold">{selectedDate.split('-').reverse().join('-')}</span>
                </p>
              </div>
              <button 
                onClick={() => setActiveCell(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sub-Header: Search bar */}
            {!isModalLoading && !modalError && modalMessages.length > 0 && (
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/30">
                <input
                  type="text"
                  placeholder="Zoek op bestandsnaam..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                />
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[250px]">
              {isModalLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-500 font-medium">Laden van berichtdetails...</span>
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
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <svg className="w-12 h-12 stroke-current mb-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Geen berichten gevonden.</span>
                </div>
              ) : (
                <div className="shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                          ID
                        </th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Bestandsnaam
                        </th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">
                          Aanmaakdatum
                        </th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">
                          Aantal Aansluitingen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredMessages.map((msg, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 text-sm font-semibold text-gray-500 tabular-nums whitespace-nowrap select-all">
                            {msg.ID}
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900 break-all select-all">
                            {msg.BESTANDSNAAM}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                            {formatDateTime(msg.AANMAAKDATUM)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                            {msg.AANTAL_AANSLUITINGEN ?? 0}
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
                  {filteredMessages.length !== modalMessages.length 
                    ? `Getoond: ${filteredMessages.length} van ${modalMessages.length} berichten`
                    : `Totaal: ${modalMessages.length} berichten`
                  }
                </span>
                <button
                  onClick={() => setActiveCell(null)}
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
