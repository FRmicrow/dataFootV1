import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const SquadTab = ({ roster, year }) => {
    const navigate = useNavigate();
    const [filterPos, setFilterPos] = useState('ALL');

    const counts = useMemo(() => {
        if (!roster) return {};
        return roster.reduce((acc, p) => {
            acc[p.position] = (acc[p.position] || 0) + 1;
            acc['ALL'] = (acc['ALL'] || 0) + 1;
            return acc;
        }, {});
    }, [roster]);

    const filteredRoster = useMemo(() => {
        if (!roster) return [];
        return filterPos === 'ALL'
            ? roster
            : roster.filter(p => p.position === filterPos);
    }, [roster, filterPos]);

    if (!roster || roster.length === 0) {
        return (
            <div className="empty-state-v4">
                <div className="empty-icon">👥</div>
                <h3>No squad data for this selection</h3>
                <p>Try another season or reset your filters to see the roster.</p>
            </div>
        );
    }

    return (
        <div className="squad-tab-v4">
            <h2 className="section-title">Squad Roster</h2>

            <div className="squad-controls">
                <div className="pos-filters">
                    {['ALL', 'Goalkeeper', 'Defender', 'Midfielder', 'Attacker'].map(pos => (
                        <button
                            key={pos}
                            className={`pos-btn ${filterPos === pos ? 'active' : ''}`}
                            onClick={() => setFilterPos(pos)}
                        >
                            {pos === 'ALL' ? 'Total' : pos}
                            <span className="count-badge">{counts[pos] || 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="table-container-v4">
                <table className="v4-common-table">
                    <thead>
                        <tr>
                            <th className="sticky-col">Player</th>
                            <th>Role & Info</th>
                            <th className="center">Apps</th>
                            <th className="center">Mins</th>
                            <th className="center highlight">G</th>
                            <th className="center">A</th>
                            <th className="center">Rating</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRoster.map(p => (
                            <tr key={p.player_id} onClick={() => navigate(`/player/${p.player_id}`)} className="v4-row interactive">
                                <td className="p-cell-v4 sticky-col">
                                    <img src={p.photo_url} alt="" className="p-img-v4" />
                                    <div className="p-name-v4">
                                        <span className="main-name clickable">{p.name}</span>
                                    </div>
                                </td>
                                <td className="p-info-v4">
                                    <div className="p-meta-compact">
                                        <div className="p-nat-box">
                                            {(() => {
                                                const natMap = {
                                                    'England': 'gb', 'Spain': 'es', 'Italy': 'it', 'France': 'fr', 'Germany': 'de',
                                                    'Portugal': 'pt', 'Netherlands': 'nl', 'Brazil': 'br', 'Argentina': 'ar', 'Belgium': 'be',
                                                    'Norway': 'no', 'Denmark': 'dk', 'Sweden': 'se', 'Switzerland': 'ch', 'Croatia': 'hr',
                                                    'Serbia': 'rs', 'Algeria': 'dz', 'Nigeria': 'ng', 'Japan': 'jp', 'Turkey': 'tr', 'Türkiye': 'tr'
                                                };
                                                const code = natMap[p.nationality] || 'un';
                                                return <img src={`https://flagcdn.com/w20/${code}.png`} alt={p.nationality} className="nat-flag-v4" />;
                                            })()}
                                        </div>
                                        <span className={`pos-tag-mini ${p.position?.toLowerCase()}`}>
                                            {p.position === 'Goalkeeper' ? 'G' :
                                                p.position === 'Defender' ? 'D' :
                                                    p.position === 'Midfielder' ? 'M' :
                                                        p.position === 'Attacker' ? 'A' : p.position?.charAt(0)}
                                        </span>
                                        <span className="p-age">{p.age}y</span>
                                    </div>
                                </td>
                                <td className="center stat-num">{p.appearances ?? 0}</td>
                                <td className="center stat-num">{p.minutes ? p.minutes.toLocaleString() : 0}</td>
                                <td className="center stat-num highlight">{p.goals ?? 0}</td>
                                <td className="center stat-num">{p.assists ?? 0}</td>
                                <td className="center">
                                    <span className={`rating-pill-v3 ${parseFloat(p.rating) >= 7.2 ? 'gold' : ''}`}>
                                        {p.rating ? parseFloat(p.rating).toFixed(1) : '—'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SquadTab;
