import React from 'react';
import { Database, Info } from 'lucide-react';

const STATUS_ROWS = [
  { label: 'Afgewezen', prefix: 'A', id: 'A' },
  { label: 'Geaccepteerd', prefix: 'G', id: 'G' },
  { label: 'Partieel Geaccepteerd', prefix: 'PG', id: 'PG' },
  { label: 'Verwerking mislukt', prefix: 'VM', id: 'VM' },
  { label: 'Wordt Verwerkt', prefix: 'WV', id: 'WV' },
  { label: 'Onbekend', prefix: 'ON', id: 'ON' }
];

export default function DashboardTable({ data, currentDomain, domains }) {
  // Helper to determine text color
  const getCellColorClass = (value, prefix) => {
    if (value === undefined || value === null) return 'text-black font-semibold opacity-30'; // placeholder state
    if (value === 0) return 'text-black font-semibold';
    if (value > 0) {
      if (prefix === 'G') return 'text-green-600 font-bold';
      return 'text-red-600 font-bold';
    }
    return 'text-black font-semibold';
  };

  return (
    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg pb-10">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 bg-gray-100 border-r border-gray-200 sticky left-0 w-48 z-10">
              Status
            </th>
            {domains.map((domain) => {
              const debugInfo = data[domain]?._debug;
              
              return (
                <th key={domain} scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 min-w-[5rem]">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    {/* Database icon is shown when this domain is currently loading */}
                    <div className={`h-5 w-5 ${currentDomain === domain ? 'visible opacity-100 animate-pulse text-blue-600' : 'invisible opacity-0'}`}>
                      <Database size={20} />
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <span>{domain}</span>
                      
                      {/* Debug Tooltip Rendering */}
                      {debugInfo && (
                        <div className="group relative flex items-center justify-center">
                          <Info size={14} className="text-gray-400 hover:text-blue-500 cursor-pointer" />
                          <div className="absolute top-6 z-50 hidden group-hover:flex flex-col items-start w-72 bg-gray-800 text-white text-xs rounded shadow-lg p-2 leading-relaxed text-left opacity-0 group-hover:opacity-100 transition-opacity whitespace-pre-wrap">
                            <span className="font-bold text-gray-300 mb-1 border-b border-gray-600 w-full">{debugInfo.context}</span>
                            <code className="mt-1">{debugInfo.sql.trim()}</code>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {STATUS_ROWS.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 bg-gray-50 border-r border-gray-200 sticky left-0 z-10 w-48 overflow-hidden text-ellipsis">
                {row.label}
              </td>
              {domains.map((domain) => {
                const domainId = domain.replace('DOM', '');
                const cellKey = `${row.prefix}${domainId}`;
                
                // Get value from data object for this domain, handling un-fetched state
                const domainData = data[domain] || {};
                const value = domainData[cellKey];

                return (
                  <td key={cellKey} className="whitespace-nowrap px-3 py-4 text-center text-sm tabular-nums border-r border-gray-100 last:border-r-0">
                    <span className={getCellColorClass(value, row.prefix)}>
                      {value !== undefined ? value : '-'}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
