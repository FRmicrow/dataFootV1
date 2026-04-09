import React from 'react';
import PropTypes from 'prop-types';
import { Card, Stack } from '../index';
import './MetricCard.css';

const MetricCard = ({
    label,
    value,
    subValue,
    trend,
    icon,
    variant = 'default',
    loading = false
}) => {
    return (
        <Card className={`ds-metric-card ds-metric-card--${variant}`}>
            <Stack gap="var(--spacing-2xs)">
                <div className="ds-metric-header">
                    <span className="ds-metric-label">{label}</span>
                    {icon && <span className="ds-metric-icon">{icon}</span>}
                </div>

                <div className="ds-metric-body">
                    {loading ? (
                        <div className="ds-metric-skeleton" />
                    ) : (
                        <h3 className="ds-metric-value">{value}</h3>
                    )}

                    {trend && !loading && (
                        <span className={`ds-metric-trend ds-metric-trend--${trend > 0 ? 'up' : 'down'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </span>
                    )}
                </div>

                {subValue && !loading && (
                    <div className="ds-metric-footer">
                        <span className="ds-metric-subvalue">{subValue}</span>
                    </div>
                )}
            </Stack>
        </Card>
    );
};

MetricCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    subValue: PropTypes.string,
    trend: PropTypes.number,
    icon: PropTypes.node,
    variant: PropTypes.oneOf(['default', 'featured']),
    loading: PropTypes.bool
};

export default MetricCard;
