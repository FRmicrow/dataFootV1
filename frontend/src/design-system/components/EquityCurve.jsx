import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * EquityCurve — SVG sparkline for portfolio equity over time.
 * Pure SVG, no external dependencies.
 */
const EquityCurve = ({ data = [], width = 280, height = 64, baseline }) => {
    const points = useMemo(() => {
        if (!data || data.length < 2) return null;
        const values = data.map(d => d.portfolio);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const pad = 4;
        const w = width - pad * 2;
        const h = height - pad * 2;

        const coords = values.map((v, i) => {
            const x = pad + (i / (values.length - 1)) * w;
            const y = pad + h - ((v - min) / range) * h;
            return `${x},${y}`;
        });
        return coords.join(' ');
    }, [data, width, height]);

    const baselineY = useMemo(() => {
        if (!data || data.length < 2 || baseline == null) return null;
        const values = data.map(d => d.portfolio);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const pad = 4;
        const h = height - pad * 2;
        return pad + h - ((baseline - min) / range) * h;
    }, [data, baseline, height]);

    if (!points) return <div style={{ width, height, opacity: 0.3, fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Pas de données</div>;

    const lastValue = data[data.length - 1]?.portfolio;
    const firstValue = data[0]?.portfolio;
    const isPositive = lastValue >= firstValue;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ display: 'block', overflow: 'visible' }}
            aria-label="Courbe d'équité"
        >
            {baselineY != null && (
                <line
                    x1={4} y1={baselineY}
                    x2={width - 4} y2={baselineY}
                    stroke="var(--color-border)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                />
            )}
            <polyline
                points={points}
                fill="none"
                stroke={isPositive ? 'var(--color-success)' : 'var(--color-error)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Last value dot */}
            {(() => {
                const last = points.split(' ').pop();
                const [x, y] = last.split(',');
                return (
                    <circle
                        cx={x} cy={y} r="3"
                        fill={isPositive ? 'var(--color-success)' : 'var(--color-error)'}
                    />
                );
            })()}
        </svg>
    );
};

EquityCurve.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
        betIndex: PropTypes.number,
        portfolio: PropTypes.number
    })),
    width: PropTypes.number,
    height: PropTypes.number,
    baseline: PropTypes.number
};

export default EquityCurve;
