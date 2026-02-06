import { useState, useEffect } from 'react';
import { formatCurrency, parseCurrencyInput } from '../../utils/format';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export default function CurrencyInput({ value, onChange, className = '', disabled = false }: CurrencyInputProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!editing) {
      setInputValue(value.toString());
    }
  }, [value, editing]);

  const handleFocus = () => {
    setEditing(true);
    setInputValue(value.toString());
  };

  const handleBlur = () => {
    setEditing(false);
    const parsed = parseCurrencyInput(inputValue);
    onChange(parsed);
  };

  return (
    <input
      type="text"
      value={editing ? inputValue : formatCurrency(value)}
      onChange={(e) => setInputValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      className={`editable-cell bg-transparent text-right font-financial text-sm px-2 py-1 rounded w-full ${className}`}
    />
  );
}
