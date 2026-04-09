import React from 'react';
import { fmtDecimal, fmtPct } from '../shared/mlUtils';

/**
 * Grid of ROI metrics cards.
 */
export const ROIMetricsGrid = ({ roi, loading }) => {
    const metrics = [
        { label: 'Paris simulés', value: roi?.totalBets ?? '—', color: 'neutral' },
        { label: 'Hit rate', value: roi ? fmtPct(roi.hitRate) : '—', color: 'neutral' },
        { label: 'Bénéfice', value: roi ? `${roi.benefit >= 0 ? '+' : ''}${fmtDecimal(roi.benefit, 0)}€` : '—', color: roi?.benefit >= 0 ? 'success' : 'danger' },
        { label: 'ROI', value: roi ? `${roi.roi >= 0 ? '+' : ''}${fmtDecimal(roi.roi, 1)}%` : '—', color: roi?.roi >= 0 ? 'success' : 'danger' },
        { label: 'Drawdown max', value: roi ? `-${fmtDecimal(roi.maxDrawdown, 1)}%` : '—', color: 'danger' },
    ];

    return (
        <div className="ml-perf__roi-grid">
            {metrics.map((m) => (
                <div key={m.label} className={`ml-perf__roi-card ml-perf__roi-card--${m.color}`}>
                    <span>{m.label}</span>
                    <strong>{loading ? '…' : m.value}</strong>
                </div>
            ))}
        </div>
    );
};

/**
 * Controls for ROI simulation.
 */
export const ROIFilterControls = ({ filters, leagues, seasons, onFilterChange }) => {
    return (
        <div className="ml-perf__roi-controls">
            <label>
                Portefeuille
                <input
                    className="ml-perf__input"
                    type="number"
                    value={filters.portfolioSize}
                    onChange={(e) => onFilterChange('portfolioSize', e.target.value)}
                />
            </label>
            <label>
                Mise
                <input
                    className="ml-perf__input"
                    type="number"
                    value={filters.stakePerBet}
                    onChange={(e) => onFilterChange('stakePerBet', e.target.value)}
                />
            </label>
            <label>
                Ligue
                <select
                    className="ml-perf__input"
                    value={filters.leagueId}
                    onChange={(e) => onFilterChange('leagueId', e.target.value)}
                >
                    <option value="">Toutes</option>
                    {leagues.map((l) => (
                        <option key={l.leagueId} value={l.leagueId}>{l.leagueName}</option>
                    ))}
                </select>
            </label>
            <label>
                Saison
                <select
                    className="ml-perf__input"
                    value={filters.seasonYear}
                    onChange={(e) => onFilterChange('seasonYear', e.target.value)}
                >
                    <option value="">Toutes</option>
                    {seasons.map((s) => (
                        <option key={s.year} value={s.year}>{s.year} ({s.oddsCount})</option>
                    ))}
                </select>
            </label>
        </div>
    );
};
