'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface Option {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface AppleSelectProps {
  label?: string;
  value: string | number;
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export default function AppleSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  icon,
  className = '',
  disabled = false,
}: AppleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5 select-none">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-2xl bg-stone-50/90 hover:bg-white border transition-all duration-200 flex items-center justify-between text-left select-none ${
          isOpen
            ? 'border-stone-900 ring-2 ring-stone-900/10 bg-white shadow-sm'
            : 'border-stone-200/90 hover:border-stone-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center space-x-2.5 truncate mr-2">
          {icon && <span className="text-stone-400 shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <div className="truncate">
            <span className={`text-sm font-semibold truncate ${selectedOption ? 'text-stone-900' : 'text-stone-400'}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            {selectedOption?.sublabel && (
              <span className="text-[11px] text-stone-400 ml-2 hidden sm:inline">
                {selectedOption.sublabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {selectedOption?.badge && (
            <span className="px-2 py-0.5 rounded-lg bg-stone-200/70 text-[10px] font-bold text-stone-700">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-stone-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-stone-900' : ''
            }`}
          />
        </div>
      </button>

      {/* Glassmorphic Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white/95 backdrop-blur-2xl border border-stone-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-1.5 max-h-64 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-stone-400 text-center">
              No options available
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-between group ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {opt.icon && (
                      <span className={isSelected ? 'text-white' : 'text-stone-400 group-hover:text-stone-600'}>
                        {opt.icon}
                      </span>
                    )}
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className={`text-[10px] ml-1.5 ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                        {opt.sublabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    {opt.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
