// ─── SearchableDropdown Component ───────────────────────────────────────
// dropdown مع بحث وتصفية فوري

import React, { useState, useRef, useEffect } from 'react';

const SearchableDropdown = ({
  options = [],
  value = '',
  onChange = () => {},
  placeholder = 'Search...',
  label = '',
  disabled = false,
  searchable = true,
  clearable = true,
  maxHeight = 300,
  className = '',
  noOptionsMessage = 'No options found',
  renderOption = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search
  const filteredOptions = searchTerm.trim()
    ? options.filter(option => {
        const searchValue = searchTerm.toLowerCase();
        const optionText = (option.name || option.label || option).toLowerCase();
        return optionText.includes(searchValue);
      })
    : options;

  // Find current selected option
  const selectedOption = options.find(opt => 
    (opt.id || opt.name || opt) === value
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleSelect = (option) => {
    onChange(option.id || option.name || option);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}

      {/* Main Input */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg flex items-center justify-between text-left transition-all ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600'
        } ${
          isOpen
            ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500/20'
            : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        <span className="flex items-center gap-2 truncate flex-1">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="text-base">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.name || selectedOption.label || selectedOption}</span>
            </>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {clearable && value && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              title="Clear selection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input */}
          {searchable && (
            <div className="sticky top-0 p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-t-lg">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Options List */}
          <ul
            className="overflow-y-auto p-1"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => handleSelect(option)}
                    className={`w-full px-3 py-2 text-left rounded text-sm transition-colors flex items-center gap-2 ${
                      (option.id || option.name || option) === value
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {option.icon && <span className="text-base">{option.icon}</span>}
                    <span className="flex-1">
                      {renderOption ? renderOption(option) : (option.name || option.label || option)}
                    </span>
                    {(option.id || option.name || option) === value && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {noOptionsMessage}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
