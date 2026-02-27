import React from 'react';
import './Table.css';

const Table = ({ columns, data, loading = false, rowKey = 'id', onRowClick, className = '' }) => {
    return (
        <div className={`ds-table-container ${className}`}>
            <table className="ds-table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key || col.dataIndex}
                                style={{ width: col.width, textAlign: col.align || 'left' }}
                            >
                                {col.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length} className="ds-table-loading">
                                <div className="ds-button-spinner"></div>
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="ds-table-empty">
                                No data available
                            </td>
                        </tr>
                    ) : (
                        data.map((record, index) => (
                            <tr
                                key={record[rowKey] || index}
                                onClick={() => onRowClick && onRowClick(record)}
                                className={onRowClick ? 'ds-table-row--interactive' : ''}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key || col.dataIndex}
                                        style={{ textAlign: col.align || 'left' }}
                                    >
                                        {col.render ? col.render(record[col.dataIndex], record, index) : record[col.dataIndex]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
