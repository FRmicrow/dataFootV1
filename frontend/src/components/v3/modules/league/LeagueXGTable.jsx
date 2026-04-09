import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Table, Card } from '../../../../design-system';

const LeagueXGTable = ({ xgStats }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'actual_points', direction: 'desc' });

    if (!xgStats || xgStats.length === 0) {
        return (
            <Card style={{ padding: 'var(--spacing-xl)', textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
                <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>📊</div>
                <h3>No xG Data Available</h3>
                <p style={{ color: 'var(--color-text-muted)' }}>Expected Goals statistics are not yet imported for this season.</p>
            </Card>
        );
    }

    const sortData = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = [...xgStats].sort((a, b) => {
        const valA = a[sortConfig.key] || 0;
        const valB = b[sortConfig.key] || 0;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
        return sortConfig.direction === 'asc' ? <span style={{ marginLeft: '4px' }}>↑</span> : <span style={{ marginLeft: '4px' }}>↓</span>;
    };

    const columns = [
        {
            key: 'team',
            title: 'Team',
            dataIndex: 'team_name',
            render: (_, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <span style={{ width: '24px', color: 'var(--color-text-muted)', fontSize: '12px' }}>{sortedData.indexOf(record) + 1}</span>
                    <img src={record.team_logo} alt={record.team_name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{record.team_name}</strong>
                        {record.matches && <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{record.matches}M ({record.wins}W-{record.draws}D-{record.loses}L)</span>}
                    </div>
                </div>
            )
        },
        {
            key: 'actual_points',
            title: <div onClick={() => sortData('actual_points')} style={{ cursor: 'pointer', textAlign: 'right' }}>Pts {renderSortIcon('actual_points')}</div>,
            dataIndex: 'actual_points',
            render: (value) => <div style={{ textAlign: 'right', fontWeight: 'bold' }}>{value ?? '-'}</div>
        },
        {
            key: 'xg_points',
            title: <div onClick={() => sortData('xg_points')} style={{ cursor: 'pointer', textAlign: 'right' }}>xPts {renderSortIcon('xg_points')}</div>,
            dataIndex: 'xg_points',
            render: (value) => <div style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-primary-400)' }}>{(value !== null && value !== undefined) ? value.toFixed(2) : '-'}</div>
        },
        {
            key: 'goals_for',
            title: <div onClick={() => sortData('goals_for')} style={{ cursor: 'pointer', textAlign: 'right' }}>GF {renderSortIcon('goals_for')}</div>,
            dataIndex: 'goals_for',
            render: (value) => <div style={{ textAlign: 'right' }}>{value ?? '-'}</div>
        },
        {
            key: 'xg_for',
            title: <div onClick={() => sortData('xg_for')} style={{ cursor: 'pointer', textAlign: 'right' }}>xG {renderSortIcon('xg_for')}</div>,
            dataIndex: 'xg_for',
            render: (value) => <div style={{ textAlign: 'right', color: 'var(--color-primary-400)' }}>{(value !== null && value !== undefined) ? value.toFixed(2) : '-'}</div>
        },
        {
            key: 'goals_against',
            title: <div onClick={() => sortData('goals_against')} style={{ cursor: 'pointer', textAlign: 'right' }}>GA {renderSortIcon('goals_against')}</div>,
            dataIndex: 'goals_against',
            render: (value) => <div style={{ textAlign: 'right' }}>{value ?? '-'}</div>
        },
        {
            key: 'xg_against',
            title: <div onClick={() => sortData('xg_against')} style={{ cursor: 'pointer', textAlign: 'right' }}>xGA {renderSortIcon('xg_against')}</div>,
            dataIndex: 'xg_against',
            render: (value) => <div style={{ textAlign: 'right', color: 'var(--color-primary-400)' }}>{(value !== null && value !== undefined) ? value.toFixed(2) : '-'}</div>
        },
        {
            key: 'np_xg',
            title: <div onClick={() => sortData('np_xg')} style={{ cursor: 'pointer', textAlign: 'right' }}>NPxG {renderSortIcon('np_xg')}</div>,
            dataIndex: 'np_xg',
            render: (value) => <div style={{ textAlign: 'right' }}>{(value !== null && value !== undefined) ? value.toFixed(2) : '-'}</div>
        },
        {
            key: 'npxg_against',
            title: <div onClick={() => sortData('npxg_against')} style={{ cursor: 'pointer', textAlign: 'right' }}>NPxGA {renderSortIcon('npxg_against')}</div>,
            dataIndex: 'npxg_against',
            render: (value) => <div style={{ textAlign: 'right' }}>{(value !== null && value !== undefined) ? value.toFixed(2) : '-'}</div>
        },
        {
            key: 'npxg_diff',
            title: <div onClick={() => sortData('npxg_diff')} style={{ cursor: 'pointer', textAlign: 'right' }}>NPxGD {renderSortIcon('npxg_diff')}</div>,
            dataIndex: 'npxg_diff',
            render: (value) => (
                <div style={{ textAlign: 'right', color: value > 0 ? 'var(--color-success)' : (value < 0 ? 'var(--color-danger)' : 'inherit') }}>
                    {value > 0 ? '+' : ''}{(value !== null && value !== undefined) ? value.toFixed(2) : '-'}
                </div>
            )
        },
        {
            key: 'ppda',
            title: <div onClick={() => sortData('ppda')} style={{ cursor: 'pointer', textAlign: 'right' }}>PPDA <div style={{fontSize:'9px', fontWeight:'normal'}}>(F / A)</div></div>,
            dataIndex: 'ppda',
            render: (_, record) => (
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', fontSize: '11px' }}>
                    <span>{record.ppda?.toFixed(2)}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{record.ppda_allowed?.toFixed(2)}</span>
                </div>
            )
        },
        {
            key: 'deep_completions',
            title: <div onClick={() => sortData('deep_completions')} style={{ cursor: 'pointer', textAlign: 'right' }}>Deep <div style={{fontSize:'9px', fontWeight:'normal'}}>(F / A)</div></div>,
            dataIndex: 'deep_completions',
            render: (_, record) => (
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', fontSize: '11px' }}>
                    <span>{record.deep_completions}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{record.deep_allowed}</span>
                </div>
            )
        }
    ];

    return (
        <div className="league-xg-table animate-fade-in" style={{ padding: 'var(--spacing-lg)' }}>
            <div style={{
                display: 'flex',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-md)',
                padding: 'var(--spacing-sm)',
                background: 'var(--glass-bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)'
            }}>
                <span><strong>Pts:</strong> Actual Points</span>
                <span>•</span>
                <span><strong>xPts:</strong> Expected Points</span>
                <span>•</span>
                <span><strong>GF:</strong> Goals For</span>
                <span>•</span>
                <span><strong>xG:</strong> Expected Goals For</span>
                <span>•</span>
                <span><strong>GA:</strong> Goals Against</span>
                <span>•</span>
                <span><strong>xGA:</strong> Expected Goals Against</span>
                <span>•</span>
                <span><strong>NPxG/NPxGA:</strong> Non-Penalty xG For/Against</span>
                <span>•</span>
                <span><strong>NPxGD:</strong> Non-Penalty xG Difference</span>
                <span>•</span>
                <span><strong>PPDA (F/A):</strong> Passes allowed per defensive action (For / Against)</span>
                <span>•</span>
                <span><strong>Deep (F/A):</strong> Deep completions within 20 yards (For / Against)</span>
            </div>
            <Table columns={columns} data={sortedData} rowKey="team_id" />
        </div>
    );
};

LeagueXGTable.propTypes = {
    xgStats: PropTypes.array
};

export default LeagueXGTable;
