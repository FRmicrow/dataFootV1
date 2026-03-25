import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { Button, Input, Grid, Stack } from '../../../../design-system';
import api from '../../../../services/api';
import { useStudio } from './StudioContext';
import './Step1_Data.css';

const CHART_TYPES = [
    { value: 'bar_race', icon: '\u{1F4CA}', title: 'Bar race', desc: 'Ranked bars evolving over time.' },
    { value: 'line', icon: '\u{1F4C8}', title: 'Trend line', desc: 'Progress across periods.' },
    { value: 'league_race', icon: '\u{1F3C1}', title: 'Standing race', desc: 'Club rankings over matchdays.' },
    { value: 'bump', icon: '\u{1F3A2}', title: 'Bump chart', desc: 'Position fluctuations.' }
];

const EMPTY_SELECTION = { players: [], leagues: [], countries: [], teams: [] };
const EMPTY_QUERIES = { player: '', team: '', league: '', country: '' };

const SearchResults = ({ items, onSelect, renderMeta }) => {
    if (!items.length) return null;

    return (
        <div className="search-results-v2">
            {items.map((item) => (
                <button
                    key={item.key}
                    className="result-item-v2"
                    onClick={() => onSelect(item)}
                    type="button"
                >
                    {item.image ? <img src={item.image} alt="" /> : <span className="result-avatar-fallback">{item.label.charAt(0)}</span>}
                    <div className="result-info-v2">
                        <span className="result-name-v2">{item.label}</span>
                        {renderMeta ? <span className="result-meta-v2">{renderMeta(item)}</span> : null}
                    </div>
                </button>
            ))}
        </div>
    );
};

SearchResults.propTypes = {
    items: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        label: PropTypes.string.isRequired,
        image: PropTypes.string
    })).isRequired,
    onSelect: PropTypes.func.isRequired,
    renderMeta: PropTypes.func
};

const SelectionTags = ({ mode, selected, onRemove }) => (
    <div className="selected-tags-v2">
        {mode === 'specific' && selected.players.map((player) => (
            <div key={player.player_id} className="tag-chip-v2">
                {player.photo_url ? <img src={player.photo_url} alt="" /> : null}
                {player.name}
                <span
                    className="tag-remove-v2"
                    onClick={() => onRemove('player', player.player_id)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') onRemove('player', player.player_id);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${player.name}`}
                >
                    ×
                </span>
            </div>
        ))}

        {(mode === 'league' || mode === 'standings') && selected.leagues.map((league) => (
            <div key={league.id} className="tag-chip-v2">
                {league.logo ? <img src={league.logo} alt="" /> : null}
                {league.name}
                <span
                    className="tag-remove-v2"
                    onClick={() => onRemove('league', league.id)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') onRemove('league', league.id);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${league.name}`}
                >
                    ×
                </span>
            </div>
        ))}

        {mode === 'country' && selected.countries.map((country) => (
            <div key={country} className="tag-chip-v2">
                {country}
                <span
                    className="tag-remove-v2"
                    onClick={() => onRemove('country', country)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') onRemove('country', country);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${country}`}
                >
                    ×
                </span>
            </div>
        ))}

        {mode === 'club' && selected.teams.map((team) => (
            <div key={team.id} className="tag-chip-v2">
                {team.logo ? <img src={team.logo} alt="" /> : null}
                {team.name}
                <span
                    className="tag-remove-v2"
                    onClick={() => onRemove('team', team.id)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') onRemove('team', team.id);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${team.name}`}
                >
                    ×
                </span>
            </div>
        ))}
    </div>
);

SelectionTags.propTypes = {
    mode: PropTypes.string.isRequired,
    selected: PropTypes.shape({
        players: PropTypes.array,
        leagues: PropTypes.array,
        countries: PropTypes.array,
        teams: PropTypes.array
    }).isRequired,
    onRemove: PropTypes.func.isRequired
};

const normalizeLeagueGroups = (groups) => {
    if (!Array.isArray(groups)) return [];
    return groups.flatMap((group) =>
        (group.leagues || []).map((league) => ({
            ...league,
            country: group.country,
            flag: group.flag
        }))
    );
};

const Step1_Data = () => {
    const {
        filters,
        setFilters,
        visual,
        setVisual,
        setError,
        isLoading,
        setIsLoading,
        finalizeStep1
    } = useStudio();

    const [mode, setMode] = useState('specific');
    const [selected, setSelected] = useState(EMPTY_SELECTION);
    const [queries, setQueries] = useState(EMPTY_QUERIES);
    const [statsMeta, setStatsMeta] = useState([]);
    const [leaguesMeta, setLeaguesMeta] = useState([]);
    const [nationalities, setNationalities] = useState([]);
    const [searchResults, setSearchResults] = useState({ players: [], teams: [] });
    const [isLoadingMeta, setIsLoadingMeta] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const loadMeta = async () => {
            setIsLoadingMeta(true);
            try {
                const [stats, leagues, countries] = await Promise.all([
                    api.getStudioStats(),
                    api.getStudioLeagues(),
                    api.getStudioNationalities()
                ]);

                if (cancelled) return;

                setStatsMeta(Array.isArray(stats) ? stats : []);
                setLeaguesMeta(normalizeLeagueGroups(leagues));
                setNationalities(Array.isArray(countries) ? countries : []);
            } catch (error) {
                if (!cancelled) {
                    setError('Could not load studio metadata.');
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingMeta(false);
                }
            }
        };

        loadMeta();

        return () => {
            cancelled = true;
        };
    }, [setError]);

    useEffect(() => {
        let cancelled = false;

        const searchPlayers = async () => {
            if (mode !== 'specific' || queries.player.trim().length < 3) {
                setSearchResults((prev) => ({ ...prev, players: [] }));
                return;
            }

            try {
                const players = await api.searchStudioPlayers(queries.player.trim());
                if (!cancelled) {
                    setSearchResults((prev) => ({ ...prev, players: Array.isArray(players) ? players : [] }));
                }
            } catch {
                if (!cancelled) {
                    setSearchResults((prev) => ({ ...prev, players: [] }));
                }
            }
        };

        const timeout = setTimeout(searchPlayers, 250);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [mode, queries.player]);

    useEffect(() => {
        let cancelled = false;

        const searchTeams = async () => {
            if (mode !== 'club' || queries.team.trim().length < 2) {
                setSearchResults((prev) => ({ ...prev, teams: [] }));
                return;
            }

            try {
                const teams = await api.searchStudioTeams(queries.team.trim());
                if (!cancelled) {
                    setSearchResults((prev) => ({ ...prev, teams: Array.isArray(teams) ? teams : [] }));
                }
            } catch {
                if (!cancelled) {
                    setSearchResults((prev) => ({ ...prev, teams: [] }));
                }
            }
        };

        const timeout = setTimeout(searchTeams, 250);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [mode, queries.team]);

    useEffect(() => {
        setSelected(EMPTY_SELECTION);
        setQueries(EMPTY_QUERIES);
        setError(null);
    }, [mode, setError]);

    const leagueSearchResults = useMemo(() => {
        if (!(mode === 'league' || mode === 'standings') || !queries.league.trim()) return [];
        const term = queries.league.trim().toLowerCase();
        return leaguesMeta
            .filter((league) => `${league.name} ${league.country}`.toLowerCase().includes(term))
            .slice(0, 12)
            .map((league) => ({
                key: league.id,
                label: league.name,
                image: league.logo,
                ...league
            }));
    }, [leaguesMeta, mode, queries.league]);

    const countrySearchResults = useMemo(() => {
        if (mode !== 'country' || !queries.country.trim()) return [];
        const term = queries.country.trim().toLowerCase();
        return nationalities
            .filter((country) => String(country).toLowerCase().includes(term))
            .slice(0, 12)
            .map((country) => ({
                key: country,
                label: country
            }));
    }, [mode, nationalities, queries.country]);

    const canSubmit = useMemo(() => {
        if (mode === 'specific') return selected.players.length > 0 && Boolean(filters.stat);
        if (mode === 'league') return selected.leagues.length > 0 && Boolean(filters.stat);
        if (mode === 'country') return selected.countries.length > 0 && Boolean(filters.stat);
        if (mode === 'club') return selected.teams.length > 0 && Boolean(filters.stat);
        if (mode === 'standings') return selected.leagues.length > 0;
        return false;
    }, [filters.stat, mode, selected]);

    const removeSelection = (type, identifier) => {
        const map = {
            player: 'players',
            league: 'leagues',
            country: 'countries',
            team: 'teams'
        };

        const key = map[type];
        setSelected((prev) => ({
            ...prev,
            [key]: prev[key].filter((item) => (item.id || item.player_id || item) !== identifier)
        }));
    };

    const handleStandardQuery = async () => {
        return api.queryStudio({
            stat: filters.stat,
            filters: {
                years: filters.years,
                leagues: selected.leagues.map((league) => league.id),
                countries: selected.countries,
                teams: selected.teams.map((team) => team.id)
            },
            selection: {
                mode: mode === 'specific' ? 'manual' : 'top_n',
                value: mode === 'specific' ? selected.players.length : 20,
                players: selected.players.map((player) => player.player_id)
            },
            options: { cumulative: true }
        });
    };

    const handleLeagueRankings = async () => {
        return api.queryStudioLeagueRankings({
            league_id: selected.leagues[0].id,
            season: filters.years[1]
        });
    };

    const handleNext = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const payload = mode === 'standings'
                ? await handleLeagueRankings()
                : await handleStandardQuery();

            const contextLabel = (() => {
                if (mode === 'specific') return selected.players.length === 1 ? selected.players[0].name : `${selected.players.length} Players`;
                if (mode === 'country') return selected.countries[0] || 'Country';
                if (mode === 'club') return selected.teams[0]?.name || 'Club';
                return selected.leagues[0]?.name || 'League';
            })();

            finalizeStep1(payload, { contextLabel }, mode);
        } catch (error) {
            setIsLoading(false);
            setError(error.message || 'Studio query failed.');
        }
    };

    const renderSearchResults = () => {
        if (mode === 'specific') {
            return (
                <SearchResults
                    items={searchResults.players
                        .filter((player) => !selected.players.some((selectedPlayer) => selectedPlayer.player_id === player.player_id))
                        .map((player) => ({
                            key: player.player_id,
                            label: player.name,
                            image: player.photo_url,
                            ...player
                        }))}
                    onSelect={(player) => {
                        setSelected((prev) => ({ ...prev, players: [...prev.players, player] }));
                        setQueries((prev) => ({ ...prev, player: '' }));
                    }}
                    renderMeta={(player) => [player.team_name, player.last_season].filter(Boolean).join(' • ')}
                />
            );
        }

        if (mode === 'league' || mode === 'standings') {
            return (
                <SearchResults
                    items={leagueSearchResults}
                    onSelect={(league) => {
                        setSelected((prev) => ({ ...prev, leagues: [league] }));
                        setQueries((prev) => ({ ...prev, league: '' }));
                    }}
                    renderMeta={(league) => [league.country, league.type].filter(Boolean).join(' • ')}
                />
            );
        }

        if (mode === 'country') {
            return (
                <SearchResults
                    items={countrySearchResults}
                    onSelect={(country) => {
                        setSelected((prev) => ({ ...prev, countries: [country.label] }));
                        setQueries((prev) => ({ ...prev, country: '' }));
                    }}
                />
            );
        }

        if (mode === 'club') {
            return (
                <SearchResults
                    items={searchResults.teams
                        .filter((team) => !selected.teams.some((selectedTeam) => selectedTeam.id === team.team_id))
                        .map((team) => ({
                            key: team.team_id,
                            label: team.name,
                            image: team.logo_url,
                            ...team
                        }))}
                    onSelect={(team) => {
                        setSelected((prev) => ({
                            ...prev,
                            teams: [{ id: team.team_id, name: team.name, logo: team.logo_url }]
                        }));
                        setQueries((prev) => ({ ...prev, team: '' }));
                    }}
                    renderMeta={(team) => team.country_name || null}
                />
            );
        }

        return null;
    };

    if (isLoadingMeta) {
        return (
            <div className="step-container animate-fade-in">
                <h2 className="step-title-v2">Selection & Scope</h2>
                <div className="studio-loading-state">Loading studio metadata...</div>
            </div>
        );
    }

    return (
        <div className="step-container animate-fade-in">
            <h2 className="step-title-v2">Selection & Scope</h2>

            <div className="data-type-selector">
                {[
                    { id: 'specific', label: 'Players' },
                    { id: 'league', label: 'League' },
                    { id: 'country', label: 'Country' },
                    { id: 'club', label: 'Club' },
                    { id: 'standings', label: 'Standings' }
                ].map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`data-type-btn ${mode === item.id ? 'active' : ''}`}
                        onClick={() => setMode(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="form-group-v2">
                <label htmlFor="studio-scope-search" className="form-label-v2">Selected Scope</label>
                <div className="studio-search-shell">
                    {mode === 'specific' ? (
                        <Input
                            id="studio-scope-search"
                            placeholder="Search players..."
                            value={queries.player}
                            onChange={(event) => setQueries((prev) => ({ ...prev, player: event.target.value }))}
                            className="input-v2"
                        />
                    ) : null}

                    {(mode === 'league' || mode === 'standings') ? (
                        <Input
                            id="studio-scope-search"
                            placeholder="Search leagues..."
                            value={queries.league}
                            onChange={(event) => setQueries((prev) => ({ ...prev, league: event.target.value }))}
                            className="input-v2"
                        />
                    ) : null}

                    {mode === 'country' ? (
                        <Input
                            id="studio-scope-search"
                            placeholder="Search nationalities..."
                            value={queries.country}
                            onChange={(event) => setQueries((prev) => ({ ...prev, country: event.target.value }))}
                            className="input-v2"
                        />
                    ) : null}

                    {mode === 'club' ? (
                        <Input
                            id="studio-scope-search"
                            placeholder="Search clubs..."
                            value={queries.team}
                            onChange={(event) => setQueries((prev) => ({ ...prev, team: event.target.value }))}
                            className="input-v2"
                        />
                    ) : null}

                    {renderSearchResults()}

                    <SelectionTags mode={mode} selected={selected} onRemove={removeSelection} />
                </div>
            </div>

            {mode !== 'standings' ? (
                <div className="form-group-v2">
                    <label htmlFor="studio-stat-select" className="form-label-v2">Metric</label>
                    <select
                        id="studio-stat-select"
                        value={filters.stat}
                        onChange={(event) => setFilters((prev) => ({ ...prev, stat: event.target.value }))}
                        className="input-v2"
                    >
                        <option value="">Select a metric...</option>
                        {statsMeta.map((stat) => (
                            <option key={stat.key} value={stat.key}>
                                {stat.label}
                            </option>
                        ))}
                    </select>
                </div>
            ) : null}

            <div className="form-group-v2">
                <label className="form-label-v2" htmlFor="time-range-start">Time Range Filter</label>
                <div className="range-grid-v2">
                    {mode === 'standings' ? (
                        <select
                            id="time-range-start"
                            value={filters.years[1]}
                            onChange={(event) => setFilters((prev) => ({
                                ...prev,
                                years: [prev.years[0], Number.parseInt(event.target.value, 10)]
                            }))}
                            className="input-v2"
                        >
                            {Array.from({ length: 15 }, (_, index) => 2025 - index).map((year) => (
                                <option key={year} value={year}>{year}/{year + 1}</option>
                            ))}
                        </select>
                    ) : (
                        <>
                            <Input
                                id="time-range-start"
                                type="number"
                                value={filters.years[0]}
                                onChange={(event) => setFilters((prev) => ({
                                    ...prev,
                                    years: [Number.parseInt(event.target.value || prev.years[0], 10), prev.years[1]]
                                }))}
                                className="input-v2"
                            />
                            <span className="range-separator-v2">TO</span>
                            <Input
                                id="time-range-end"
                                type="number"
                                value={filters.years[1]}
                                onChange={(event) => setFilters((prev) => ({
                                    ...prev,
                                    years: [prev.years[0], Number.parseInt(event.target.value || prev.years[1], 10)]
                                }))}
                                className="input-v2"
                            />
                        </>
                    )}
                </div>
            </div>

            <Stack gap="md" className="form-group-v2">
                <span className="form-label-v2">Chart Type</span>
                <Grid columns="repeat(auto-fit, minmax(180px, 1fr))" gap="md" className="config-grid-v2">
                    {CHART_TYPES.map(ct => (
                        <button
                            key={ct.value}
                            className={`config-card-v2 ${visual.type === ct.value ? 'active' : ''}`}
                            onClick={() => setVisual(prev => ({ ...prev, type: ct.value }))}
                            type="button"
                        >
                            <div className="card-icon-v2">{ct.icon}</div>
                            <h4 className="card-title-v2">{ct.title}</h4>
                            <p className="card-desc-v2">{ct.desc}</p>
                        </button>
                    ))}
                </Grid>
            </Stack>

            <div className="form-group-v2">
                <label htmlFor="animation-speed-slider" className="form-label-v2">Speed</label>
                <div className="slider-container-v2">
                    <div className="slider-header-v2">
                        <span className="slider-label-v2">Transition Pace</span>
                        <span className="slider-value-v2">{visual.speed}x</span>
                    </div>
                    <input
                        id="animation-speed-slider"
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.5"
                        value={visual.speed}
                        onChange={(e) => setVisual(prev => ({ ...prev, speed: Number.parseFloat(e.target.value) }))}
                        className="slider-v2"
                    />
                </div>
            </div>

            <div className="step-actions">
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleNext}
                    loading={isLoading}
                    disabled={!canSubmit}
                    className="studio-next-button"
                >
                    Preview Animation &rarr;
                </Button>
            </div>
        </div>
    );
};

export default Step1_Data;
