import React, { useEffect, useState } from 'react';
import { useStudio } from './StudioContext';
import axios from 'axios';

const Step1Data = () => {
    const { wizardData, updateWizardData } = useStudio();
    const [stats, setStats] = useState([]);
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch metadata on mount
        const fetchMeta = async () => {
            try {
                // Mocking API calls for now if backend isn't fully ready
                // const statsRes = await axios.get('/api/studio/meta/stats');
                // const leaguesRes = await axios.get('/api/studio/meta/leagues');

                // setStats(statsRes.data);
                // setLeagues(leaguesRes.data);

                // Placeholder data
                setStats([
                    { id: 'goals', label: 'Goals Scored' },
                    { id: 'assists', label: 'Assists' },
                    { id: 'yellow_cards', label: 'Yellow Cards' }
                ]);
                setLeagues([
                    { id: 'PL', name: 'Premier League' },
                    { id: 'LL', name: 'La Liga' },
                    { id: 'SA', name: 'Serie A' }
                ]);

            } catch (error) {
                console.error("Failed to fetch meta data", error);
            }
        };
        fetchMeta();
    }, []);

    const handleChange = (field, value) => {
        updateWizardData({ [field]: value });
    };

    return (
        <div className="step-container">
            <h2>Select your Data Source</h2>
            <div className="form-group">
                <label className="form-label">Statistic</label>
                <select
                    className="form-control"
                    value={wizardData.stat}
                    onChange={(e) => handleChange('stat', e.target.value)}
                >
                    <option value="">Select a stat...</option>
                    {stats.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Scope</label>
                <div className="radio-group">
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="scope"
                            value="league"
                            checked={wizardData.scope === 'league'}
                            onChange={(e) => handleChange('scope', e.target.value)}
                        />
                        By League
                    </label>
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="scope"
                            value="country"
                            checked={wizardData.scope === 'country'}
                            onChange={(e) => handleChange('scope', e.target.value)}
                        />
                        By Country
                    </label>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">
                    {wizardData.scope === 'league' ? 'Select League' : 'Select Country'}
                </label>
                <select
                    className="form-control"
                    value={wizardData.scopeId}
                    onChange={(e) => handleChange('scopeId', e.target.value)}
                >
                    <option value="">Select...</option>
                    {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Time Range (Years)</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="number"
                        className="form-control"
                        value={wizardData.yearStart}
                        onChange={(e) => handleChange('yearStart', parseInt(e.target.value))}
                    />
                    <span style={{ alignSelf: 'center' }}>to</span>
                    <input
                        type="number"
                        className="form-control"
                        value={wizardData.yearEnd}
                        onChange={(e) => handleChange('yearEnd', parseInt(e.target.value))}
                    />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Player Selection</label>
                <div className="radio-group">
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="playerSelection"
                            value="topN"
                            checked={wizardData.playerSelection === 'topN'}
                            onChange={(e) => handleChange('playerSelection', e.target.value)}
                        />
                        Top {wizardData.topN} Players
                    </label>
                    {/* Add specific players option later */}
                </div>
                {wizardData.playerSelection === 'topN' && (
                    <input
                        type="range"
                        min="5"
                        max="20"
                        value={wizardData.topN}
                        onChange={(e) => handleChange('topN', parseInt(e.target.value))}
                        style={{ width: '100%', marginTop: '0.5rem' }}
                    />
                )}
            </div>
        </div>
    );
};

export default Step1Data;
