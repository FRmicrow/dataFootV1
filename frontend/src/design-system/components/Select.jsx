import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';

import './Select.css';

const customStyles = {
    control: (provided, state) => ({
        ...provided,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        borderColor: state.isFocused ? 'var(--color-primary-500)' : 'var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px',
        boxShadow: state.isFocused ? '0 0 0 2px rgba(139, 92, 246, 0.1)' : 'none',
        '&:hover': {
            borderColor: state.isFocused ? 'var(--color-primary-500)' : 'var(--color-border-hover)',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
        },
        transition: 'var(--transition-fast)',
        minHeight: '38px',
        cursor: 'pointer'
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: '0 8px',
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
        fontWeight: 'var(--font-weight-medium)',
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        zIndex: 1000
    }),
    menuList: (provided) => ({
        ...provided,
        padding: 0,
        '::-webkit-scrollbar': {
            width: '6px',
        },
        '::-webkit-scrollbar-track': {
            background: 'transparent',
        },
        '::-webkit-scrollbar-thumb': {
            background: 'var(--color-border)',
            borderRadius: 'var(--radius-full)',
        },
        '::-webkit-scrollbar-thumb:hover': {
            background: 'var(--color-border-hover)',
        }
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: (() => {
            if (state.isSelected) return 'var(--color-primary-600)';
            if (state.isFocused) return 'rgba(255, 255, 255, 0.05)';
            return 'transparent';
        })(),
        color: state.isSelected ? 'white' : 'var(--color-text-main)',
        fontSize: 'var(--font-size-sm)',
        padding: '10px 12px',
        cursor: 'pointer',
        '&:active': {
            backgroundColor: 'var(--color-primary-700)',
        }
    }),
    placeholder: (provided) => ({
        ...provided,
        color: 'var(--color-text-dim)',
        fontSize: 'var(--font-size-sm)',
    }),
    indicatorSeparator: () => ({
        display: 'none',
    }),
    dropdownIndicator: (provided) => ({
        ...provided,
        color: 'var(--color-text-dim)',
        '&:hover': {
            color: 'var(--color-primary-400)',
        }
    })
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

