import React from 'react';
import PropTypes from 'prop-types';
import { Badge, Tooltip } from '../../../../../design-system';
import { ML_GLOSSARY_GROUPS, ML_GLOSSARY_TERMS } from './mlGlossaryData';
import './MLGlossaryTooltip.css';

const MLGlossaryTooltip = ({ topic = 'performance', label = 'Glossaire' }) => {
    const terms = (ML_GLOSSARY_GROUPS[topic] || [])
        .map((key) => ML_GLOSSARY_TERMS[key])
        .filter(Boolean);

    if (!terms.length) return null;

    return (
        <Tooltip
            content={(
                <div className="ml-glossary-tooltip">
                    <strong className="ml-glossary-tooltip__title">{label}</strong>
                    <div className="ml-glossary-tooltip__items">
                        {terms.map((item) => (
                            <div key={item.term} className="ml-glossary-tooltip__item">
                                <span>{item.term}</span>
                                <p>{item.definition}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        >
            <Badge variant="neutral" size="sm">?</Badge>
        </Tooltip>
    );
};

MLGlossaryTooltip.propTypes = {
    topic: PropTypes.oneOf(['models', 'performance', 'foresight', 'analytics']),
    label: PropTypes.string,
};

export default MLGlossaryTooltip;
