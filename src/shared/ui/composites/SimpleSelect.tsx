// src/shared/ui/SimpleSelect.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Box, Typography } from '../muiCompat';
import { ArrowDropDownIcon } from '../icons';

export type SimpleSelectOption = { value: string; label: string; group?: string; disabled?: boolean };

type SimpleSelectProps = {
    value: string;
    options: SimpleSelectOption[];
    onChange: (newValue: string) => void;
    placeholder?: string;
    fullWidth?: boolean;
    /** @deprecated Use className and shared size classes. */
    sx?: object;
    className?: string;
    disabled?: boolean;
};

export function SimpleSelect({ value, options, onChange, placeholder, fullWidth, sx, className, disabled = false }: SimpleSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectedLabel = options.find(option => option.value === value)?.label || value;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOptionClick = (option: SimpleSelectOption) => {
        if (disabled || option.disabled) return;
        onChange(option.value);
        setIsOpen(false);
    };

    const rootClass = [
        'think-os',
        'think-simple-select',
        fullWidth ? 'think-simple-select--full' : '',
        isOpen ? 'is-open' : '',
        disabled ? 'is-disabled' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <Box ref={wrapperRef} className={rootClass} sx={sx}>
            <Box
                className="think-simple-select__trigger"
                role="combobox"
                aria-expanded={isOpen}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
                onKeyDown={(event: KeyboardEvent) => {
                    if (disabled) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setIsOpen(current => !current);
                    }
                    if (event.key === 'Escape') setIsOpen(false);
                }}
            >
                <Typography className={`think-simple-select__value${value ? '' : ' is-placeholder'}`}>
                    {value ? selectedLabel : <em>{placeholder}</em>}
                </Typography>
                <ArrowDropDownIcon className="think-simple-select__arrow" />
            </Box>

            {isOpen && (
                <Box className="think-simple-select__menu" role="listbox">
                    {options.map((option, index) => {
                        const showGroupHeader = option.group && option.group !== options[index - 1]?.group;
                        return (
                            <div key={`${option.group || 'default'}-${option.value}`}>
                                {showGroupHeader && <Box className="think-simple-select__group">{option.group}</Box>}
                                <Box
                                    className={[
                                        'think-simple-select__option',
                                        value === option.value ? 'is-selected' : '',
                                        option.disabled ? 'is-disabled' : '',
                                    ].filter(Boolean).join(' ')}
                                    role="option"
                                    aria-selected={value === option.value}
                                    aria-disabled={option.disabled}
                                    onClick={() => handleOptionClick(option)}
                                >
                                    {option.label}
                                </Box>
                            </div>
                        );
                    })}
                </Box>
            )}
        </Box>
    );
}
