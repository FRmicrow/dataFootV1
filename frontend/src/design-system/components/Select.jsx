import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';

import './Select.css';

const customStyles = {
    control: (provided, state) => ({
        ...provided,
        backgroundColor: state.isFocused
            ? 'rgba(15, 23, 42, 0.7)'
            : 'rgba(15, 23, 42, 0.45)',
        borderColor: state.isFocused
            ? 'var(--color-primary-400)'
            : 'var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '0 2px',
        boxShadow: state.isFocused
            ? '0 0 0 2px rgba(139, 92, 246, 0.18), 0 4px 12px rgba(0,0,0,0.3)'
            : '0 1px 3px rgba(0,0,0,0.2)',
        '&:hover': {
            borderColor: state.isFocused
                ? 'var(--color-primary-400)'
                : 'var(--color-primary-600)',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
        },
        transition: 'all 0.15s ease',
        minHeight: '36px',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: '0 10px',
        gap: '4px',
    }),
    input: (provided) => ({
        ...provided,
        color: 'var(--color-text-main)',
        fontSize: 'var(--font-size-sm)',
    }),
    singleValue: (provided) => ({
        ...provided,
        color: 'var(--color-text-main)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: '500',
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: 'rgba(10, 15, 30, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        zIndex: 1000,
        marginTop: '4px',
    }),
    menuList: (provided) => ({
        ...provided,
        padding: '4px',
        '::-webkit-scrollbar': { width: '4px' },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
            background: 'var(--color-border)',
            borderRadius: 'var(--radius-full)',
        },
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected
            ? 'rgba(139, 92, 246, 0.25)'
            : state.isFocused
                ? 'rgba(139, 92, 246, 0.1)'
                : 'transparent',
        color: state.isSelected
            ? 'var(--color-primary-300)'
            : 'var(--color-text-main)',
        fontSize: 'var(--font-size-sm)',
        padding: '8px 12px',
        borderRadius: 'var(--radius-xs)',
        cursor: 'pointer',
        fontWeight: state.isSelected ? '600' : 'normal',
        borderLeft: state.isSelected
            ? '2px solid var(--color-primary-400)'
            : '2px solid transparent',
        transition: 'all 0.1s ease',
        '&:active': {
            backgroundColor: 'rgba(139, 92, 246, 0.3)',
        },
    }),
    placeholder: (provided) => ({
        ...provided,
        color: 'var(--color-text-dim)',
        fontSize: 'var(--font-size-sm)',
    }),
    indicatorSeparator: () => ({
        display: 'none',
    }),
    dropdownIndicator: (provided, state) => ({
        ...provided,
        color: state.isFocused
            ? 'var(--color-primary-400)'
            : 'var(--color-text-dim)',
        transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.2s ease, color 0.15s ease',
        padding: '0 8px',
        '&:hover': {
            color: 'var(--color-primary-400)',
        },
    }),
    noOptionsMessage: (provided) => ({
        ...provided,
        color: 'var(--color-text-dim)',
        fontSize: 'var(--font-size-sm)',
        padding: '12px',
    }),
};

const CustomSelect = ({ options, value, onChange, placeholder, isSearchable = false, className = '', style = {}, ...props }) => {
    return (
        <div className={`ds-select-container ${className}`} style={style}>
            <Select
                options={options}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                isSearchable={isSearchable}
                styles={customStyles}
                classNamePrefix="ds-select"
                {...props}
            />
        </div>
    );
};

CustomSelect.propTypes = {
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.any,
        label: PropTypes.string
    })).isRequired,
    value: PropTypes.any,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    isSearchable: PropTypes.bool,
    className: PropTypes.string,
    style: PropTypes.object
};

export default CustomSelect;
