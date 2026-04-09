import React from 'react';
import PropTypes from 'prop-types';

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

Input.propTypes = {
    type: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
    className: PropTypes.string,
    style: PropTypes.object,
    disabled: PropTypes.bool
};


export default Input;
