import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { downieTheme } from '../../styles/downie-theme';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  style?: CSSProperties;
}

export function CustomSelect({ options, value, onChange, style }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || (options.length > 0 ? options[0].value : ''));
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setSelectedValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    setIsOpen(false);
    if (onChange) {
      onChange(optionValue);
    }
  };

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || '';

  const containerStyle: CSSProperties = {
    position: 'relative',
    fontFamily: downieTheme.fonts.system,
    ...style,
  };

  const selectedValueStyle: CSSProperties = {
    padding: `${downieTheme.spacing.xs} ${downieTheme.spacing.sm}`,
    borderRadius: downieTheme.radius.button,
    border: `1px solid ${downieTheme.colors.border.light}`,
    background: 'white',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    userSelect: 'none',
  };

  const optionsContainerStyle: CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    border: `1px solid ${downieTheme.colors.border.light}`,
    borderRadius: downieTheme.radius.button,
    marginTop: downieTheme.spacing.xs,
    zIndex: 10,
    maxHeight: '200px',
    overflowY: 'auto',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  const optionStyle: CSSProperties = {
    padding: `${downieTheme.spacing.xs} ${downieTheme.spacing.sm}`,
    fontSize: '13px',
    cursor: 'pointer',
    borderBottom: `1px solid ${downieTheme.colors.border.light}`,
  };

  const arrowStyle: CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderTop: `4px solid ${downieTheme.colors.text.secondary}`,
    transition: 'transform 0.2s ease',
    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  };

  return (
    <div ref={selectRef} style={containerStyle}>
      <div style={selectedValueStyle} onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedLabel}</span>
        <span style={arrowStyle} />
      </div>
      {isOpen && (
        <div style={optionsContainerStyle}>
          {options.map(option => (
            <div
              key={option.value}
              style={{
                ...optionStyle,
                background: selectedValue === option.value ? 'rgba(0, 0, 0, 0.05)' : 'white',
                fontWeight: selectedValue === option.value ? 600 : 'normal',
              }}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}