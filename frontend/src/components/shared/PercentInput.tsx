import { useState, useEffect } from 'react';
import { formatPercent, parsePercentInput } from '../../utils/format';

interface PercentInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  decimals?: number;
  disabled?: boolean;
}

export default function PercentInput({ value, onChange, className = '', decimals = 2, disabled = false }: PercentInputProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!editing) {
      setInputValue((value * 100).toFixed(decimals));
    }
  }, [value, editing, decimals]);

  const handleFocus = () => {
    setEditing(true);
    setInputValue((value * 100).toFixed(decimals));
  };

  const handleBlur = () => {
    setEditing(false);
    const parsed = parsePercentInput(inputValue);
    onChange(parsed);
  };

  return (
    <input
      type="text"
      value={editing ? inputValue : formatPercent(value, decimals)}
      onChange={(e) => setInputValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      className={`editable-cell bg-transparent text-right font-financial text-sm px-2 py-1 rounded w-full ${className}`}
    />
  );
}
