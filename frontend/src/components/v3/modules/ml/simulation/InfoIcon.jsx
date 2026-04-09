import React from 'react';
import PropTypes from 'prop-types';

const InfoIcon = ({ text }) => (
    <span className="info-icon" data-tooltip={text}>?</span>
);

InfoIcon.propTypes = {
    text: PropTypes.string.isRequired
};

export default InfoIcon;
