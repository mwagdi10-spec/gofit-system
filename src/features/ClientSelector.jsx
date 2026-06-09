// ─── ClientSelector Feature ───────────────────────────────────────────
// مكون اختيار العميل المتقدم

import React, { useState, useMemo } from 'react';
import SearchableDropdown from '../components/ui/SearchableDropdown';

const ClientSelector = ({
  clientNames = {},
  value = '',
  onChange = () => {},
  placeholder = 'Select Client...',
  showMetrics = false,
  showPhase = true
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Format options for dropdown
  const options = useMemo(() => {
    return Object.entries(clientNames).map(([phone, client]) => ({
      id: phone,
      name: titleCase(client.name),
      phone,
      phase: client.nasm_phase || 1,
      goal: client.goal || '',
      level: client.level || ''
    }));
  }, [clientNames]);

  const selectedClient = options.find(opt => opt.id === value);

  return (
    <div className="space-y-3">
      {/* Main Dropdown */}
      <SearchableDropdown
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        renderOption={(opt) => (
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-white">
                {opt.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {opt.phone}
              </p>
            </div>
            {showPhase && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                P{opt.phase}
              </span>
            )}
          </div>
        )}
      />

      {/* Selected Client Details */}
      {selectedClient && (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {selectedClient.name}
            </h3>
            {showPhase && (
              <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-bold">
                Phase {selectedClient.phase}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {selectedClient.goal && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Goal</p>
                <p className="text-slate-900 dark:text-white font-medium">{selectedClient.goal}</p>
              </div>
            )}
            {selectedClient.level && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Level</p>
                <p className="text-slate-900 dark:text-white font-medium">{selectedClient.level}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Phone</p>
              <p className="text-slate-900 dark:text-white font-medium">{selectedClient.phone}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function
function titleCase(str = '') {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default ClientSelector;
