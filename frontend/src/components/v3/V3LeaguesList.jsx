import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './V3LeaguesList.css';

const V3LeaguesList = () => {
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImportedLeagues = async () => {
            try {
                const res = await axios.get('/api/v3/leagues/imported');
                setLeagues(res.data);
            } catch (error) {
                console.error("Failed to load imported leagues", error);
            } finally {
                setLoading(false);
            }
        };

        fetchImportedLeagues();
    }, []);

    if (loading) return (
        <div className="v3-leagues-page loading">
            <div className="spinner"></div>
            <p>Scanning V3 Vault...</p>
        </div>
    );

    return (
        <div className="v3-leagues-page">
            <header className="v3-header">
                <h1>V3 Competition Data</h1>
                <p>Browse competitions successfully migrated to the new schema.</p>
            </header>

            {leagues.length === 0 ? (
                <div className="empty-state">
                    <span className="icon">📂</span>
                    <h3>No V3 Data Found</h3>
                    <p>It seems no leagues have been imported using the V3 tool yet.</p>
                    <Link to="/v3/import" className="btn-v3-primary">Open Import Tool</Link>
                </div>
            ) : (
                <div className="leagues-container">
                    {/* Object.entries on a grouped object */}
                    {Object.entries(leagues.reduce((acc, league) => {
                        const country = league.country_name;
                        if (!acc[country]) acc[country] = { name: country, flag: league.flag_url, items: [] };
                        acc[country].items.push(league);
                        return acc;
                    }, {})).map(([countryName, group]) => (
                        <div key={countryName} className="country-section">
                            <h2 className="country-title">
                                <img src={group.flag} alt="" className="country-flag" />
                                {countryName}
                            </h2>
                            <div className="leagues-grid">
                                {group.items.map((league) => (
                                    <div key={league.league_id} className="v3-league-card">
                                        <div className="v3-league-logo-wrap">
                                            <img src={league.logo_url} alt={league.name} className="v3-league-logo" />
                                            <div className="v3-season-badge">{league.years_imported.length} Seasons</div>
                                        </div>
                                        <div className="v3-league-info">
                                            <h3>{league.name}</h3>
                                            <p className="season-list-hint">
                                                {league.years_imported.slice(0, 3).join(', ')}
                                                {league.years_imported.length > 3 && '...'}
                                            </p>
                                            <Link
                                                to={`/v3/league/${league.league_id}/season/${league.years_imported[0]}`}
                                                className="btn-view-stats"
                                            >
                                                Explore Archive ↗
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default V3LeaguesList;
