import React from 'react';
import './Table.css';

const Table = ({ columns, data, loading = false, rowKey = 'id', onRowClick, className = '', style = {}, interactive = false }) => {
    if (loading) {
        return <div className="ds-table-loading">Loading data...</div>;
    }

    if (!data || data.length === 0) {
        return <div className="ds-table-empty">No data to display.</div>;
    }

    return (
        <div className={`ds-table-container ${className}`} style={style}>
            <table className={`ds-table ${interactive ? 'interactive' : ''}`}>
                <thead>
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={col.key || idx} style={col.width ? { width: col.width } : {}}>
                                {col.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr
                            key={row[rowKey] || rowIndex}
                            onClick={() => onRowClick && onRowClick(row)}
                            className={onRowClick ? 'clickable-row' : ''}
                        >
                            {columns.map((col, colIndex) => (
                                <td key={`${row[rowKey] || rowIndex}-${col.key || colIndex}`}>
                                    {col.render ? col.render(row[col.dataIndex], row) : row[col.dataIndex]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Table;