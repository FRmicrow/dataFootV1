import React from 'react';
import './Table.css';

const Table = ({
    columns, data, loading = false, rowKey = 'id',
    onRowClick, className = '', style = {}, interactive = false,
    expandedRowRender, expandedRowKeys = [], onExpand
}) => {
    return (
        <div className={`ds-table-container ${className}`} style={style}>
            <table className={`ds-table ${interactive ? 'ds-table--interactive' : ''}`}>
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
                        data.map((record, index) => {
                            const key = typeof rowKey === 'function' ? rowKey(record) : (record[rowKey] || index);
                            const isExpanded = expandedRowKeys.includes(key);
                            return (
                                <React.Fragment key={key}>
                                    <tr
                                        onClick={() => {
                                            if (onRowClick) onRowClick(record);
                                            if (onExpand) onExpand(record, !isExpanded);
                                        }}
                                        className={onRowClick || onExpand || interactive ? 'ds-table-row--interactive' : ''}
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
                                    {isExpanded && expandedRowRender && (
                                        <tr className="ds-table-expanded-row ds-bg-surface-800">
                                            <td colSpan={columns.length} style={{ padding: 0 }}>
                                                <div className="animate-fade-in">
                                                    {expandedRowRender(record)}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
