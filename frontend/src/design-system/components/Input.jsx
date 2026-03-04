import React from 'react';
import './Input.css';

const Input = ({
    type = 'text',
    value,
    onChange,
    placeholder,
    className = '',
    style = {},
    disabled = false,
    ...props
}) => {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`ds-input ${className}`}
            style={style}
            {...props}
        />
    );
};

export default Input;
