import React from 'react';
import { Database } from 'lucide-react';

const PROCESS_ROWS = [
  { label: 'MOVEIN',   id: 'MOVEIN' },
  { label: 'MOVEOUT',  id: 'MOVEOUT' },
  { label: 'EOSUPPLY', id: 'EOSUPPLY' },
  { label: 'SWITCHLV', id: 'SWITCHLV' },
  { label: 'SWITCHPV', id: 'SWITCHPV' },
  { label: 'PERMTR',   id: 'PERMTR' },
  { label: 'ALLMTCHG', id: 'ALLMTCHG' },
  { label: 'MONTHMTR', id: 'MONTHMTR' },
];

export default function AcceptedReadingsTable({ data = {}, currentDomain, domains, onCellClick }) {
  // Helper to determine text color
  const getCellColorClass = (value) => {
    if (value === undefined || value === null) return 'text-black font-semibold opacity-30';
    if (value === 0) return 'text-black font-semibold';
    if (value > 0) return 'text-blue-700 font-bold';
    return 'text-black font-semibold';
  };

  return (
    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-2.5 pl-4 pr-2 text-left text-sm font-semibold text-gray-900 sm:pl-6 bg-gray-100 border-r border-gray-200 sticky left-0 w-40 z-10">
              ProcesID
            </th>
            {domains.map((domain) => (
              <th key={domain} scope="col" className="px-1.5 py-2.5 text-center text-sm font-semibold text-gray-900 min-w-[3.5rem]">
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className={`h-5 w-5 ${currentDomain === domain ? 'visible opacity-100 animate-pulse text-blue-600' : 'invisible opacity-0'}`}>
                    <Database size={20} />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>{domain}</span>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {PROCESS_ROWS.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap py-1.5 pl-4 pr-2 text-sm font-medium text-gray-900 sm:pl-6 bg-gray-50 border-r border-gray-200 sticky left-0 z-10 w-40 overflow-hidden text-ellipsis">
                {row.label}
              </td>
              {domains.map((domain) => {
                const domainId = domain.replace('DOM', '');
                const cellKey = `ACCEPTED_${row.id}_${domainId}`;
                
                // Get value from data object for this domain
                const domainData = data[domain] || {};
                const value = domainData[cellKey];

                return (
                  <td key={cellKey} className="whitespace-nowrap px-1.5 py-1.5 text-center text-sm tabular-nums border-r border-gray-100 last:border-r-0 relative">
                    {value !== undefined && value > 0 && onCellClick ? (
                      <button
                        onClick={() => onCellClick(domain, row.id, value)}
                        className={`${getCellColorClass(value)} hover:underline cursor-pointer focus:outline-none`}
                      >
                        {value}
                      </button>
                    ) : (
                      <span className={getCellColorClass(value)}>
                        {value !== undefined ? value : '-'}
                      </span>
                    )}
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
