import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, circle, className = '', style }) => {
    const styles = {
        width: width || '100%',
        height: height || '16px',
        borderRadius: circle ? '50%' : 'var(--radius-sm)',
        ...style
    };

    return <div className={`ds-skeleton ${className}`} style={styles} />;
};

export const CardSkeleton = () => (
    <div className="ds-card ds-skeleton-card">
        <div className="ds-card-header">
            <Skeleton width="40%" height="18px" />
        </div>
        <div className="ds-card-body">
            <Stack gap="var(--spacing-sm)">
                <Skeleton width="100%" height="12px" />
                <Skeleton width="90%" height="12px" />
                <Skeleton width="95%" height="12px" />
            </Stack>
        </div>
    </div>
);

export const MetricCardSkeleton = () => (
    <div className="ds-card ds-metric-card ds-skeleton-metric">
        <Skeleton width="30%" height="10px" style={{ marginBottom: '12px' }} />
        <Skeleton width="60%" height="32px" style={{ marginBottom: '8px' }} />
        <Skeleton width="40%" height="10px" />
    </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
    <div className="ds-table-container">
        <table className="ds-table">
            <thead>
                <tr>
                    {Array(cols).fill(0).map((_, i) => (
                        <th key={i}><Skeleton width="60%" height="10px" /></th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {Array(rows).fill(0).map((_, i) => (
                    <tr key={i}>
                        {Array(cols).fill(0).map((_, j) => (
                            <td key={j}><Skeleton width={j === 0 ? "80%" : "60%"} height="12px" /></td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// Helper for Stack if not imported
const Stack = ({ children, gap, direction = 'column' }) => (
    <div style={{ display: 'flex', flexDirection: direction, gap }}>
        {children}
    </div>
);

export default Skeleton;
