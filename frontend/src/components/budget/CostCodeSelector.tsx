import { useState, useEffect, useRef, useCallback } from 'react';
import { costCodesApi } from '../../api/cost_codes';
import type { CostCode } from '../../types/cost_code';
import { Search, ChevronDown } from 'lucide-react';

interface Props {
  value?: string;
  onChange: (code: CostCode) => void;
  disabled?: boolean;
}

export default function CostCodeSelector({ value, onChange, disabled = false }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CostCode[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const data = await costCodesApi.search(query);
      setResults(data);
      setSelectedIndex(-1);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearch(query);
    setIsOpen(query.length > 0);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const handleSelect = (code: CostCode) => {
    onChange(code);
    setSearch('');
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => search.length > 0 && setIsOpen(true)}
          placeholder="Search cost codes..."
          disabled={disabled}
          className="w-full bg-navy-900 text-slate-300 text-sm rounded px-9 py-2 border border-navy-700 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
      </div>

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-navy-900 border border-navy-700 rounded-lg shadow-lg z-50">
          {loading ? (
            <div className="py-3 px-4 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-3 px-4 text-center text-slate-400 text-sm">
              {search.length < 2 ? 'Type to search...' : 'No cost codes found'}
            </div>
          ) : (
            results.map((code, index) => (
              <div
                key={code.cost_code_id}
                onClick={() => handleSelect(code)}
                className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-600/30 text-blue-300'
                    : 'text-slate-300 hover:bg-navy-800'
                }`}
              >
                <div className="font-mono text-xs text-slate-400">
                  {code.division_number} {code.category_number} {code.subcategory_number} {code.item_code}
                </div>
                <div className="text-slate-200">
                  {code.item_name}
                </div>
                {code.default_unit_type && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    Unit: {code.default_unit_type}
                    {code.default_unit_price && ` @ $${code.default_unit_price.toFixed(2)}`}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
