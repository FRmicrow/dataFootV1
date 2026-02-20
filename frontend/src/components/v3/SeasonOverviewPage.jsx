
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Components
import LeagueOverview from './league/LeagueOverview';
import StandingsTable from './league/StandingsTable';
import FixturesList from './league/FixturesList';
import SquadList from './league/SquadList';

const SeasonOverviewPage = () => {
    const { id, year } = useParams();
    const navigate = useNavigate();

    // Navigation & Selection State
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'standings', 'fixtures', 'squads'
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [teamSquad, setTeamSquad] = useState([]);
    const [squadLoading, setSquadLoading] = useState(false);

    // Data State
    const [data, setData] = useState(null); // Overview data
    const [standings, setStandings] = useState([]);
    const [fixturesData, setFixturesData] = useState({ fixtures: [], rounds: [] });
    const [selectedRound, setSelectedRound] = useState('');

    // Dynamic Standings State
    const [rangeStart, setRangeStart] = useState(1);
    const [rangeEnd, setRangeEnd] = useState(38);
    const [isDynamicMode, setIsDynamicMode] = useState(false);

    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 1. Fetch Main Season Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Determine target season
                let targetYear = year;

                if (!year) {
                    const res = await api.getLeagueSeasons(id);
                    const seasonsList = res.seasons || [];
                    const imported = seasonsList.filter(s => s.imported_players === 1);
                    if (imported.length > 0) {
                        targetYear = imported[0].season_year;
                        navigate(`/league/${id}/season/${targetYear}`, { replace: true });
                        return;
                    } else {
                        throw new Error("No imported seasons found for this league.");
                    }
                }

                // Parallel Fetching
                const [overviewRes, standingsRes, fixturesRes] = await Promise.all([
                    api.getSeasonOverview(id, targetYear),
                    api.getStandings(id, targetYear),
                    api.getLeagueFixtures(id, targetYear)
                ]);

                setData(overviewRes);
                setStandings(standingsRes);

                // Auto-set max round logic
                if (standingsRes && standingsRes.length > 0 && !isDynamicMode) {
                    const maxPlayed = Math.max(...standingsRes.map(t => t.played));
                    setRangeEnd(maxPlayed || 38);
                }

                setFixturesData(fixturesRes || { fixtures: [], rounds: [] });
                if (fixturesRes?.rounds?.length > 0) {
                    setSelectedRound(fixturesRes.rounds[0]);
                }

            } catch (err) {
                console.error("Error fetching season analytics:", err);
                setError(err.response?.data?.error || err.message || "Failed to load dashboard.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id, year, navigate]); // Removed isDynamicMode dependency to avoid loop, handled logically

    // 2. Fetch Squad when team selected
    useEffect(() => {
        const fetchSquad = async () => {
            if (!selectedTeamId) return;

            // Allow fetch on 'overview' AND 'squads' tabs since both show squads
            if (activeTab !== 'squads' && activeTab !== 'overview') return;

            setSquadLoading(true);
            try {
                const res = await api.getTeamSquad(id, year, selectedTeamId);
                setTeamSquad(res);
            } catch (err) {
                console.error("Failed to fetch squad:", err);
            } finally {
                setSquadLoading(false);
            }
        };
        fetchSquad();
    }, [selectedTeamId, id, year, activeTab]);

    const handleSeasonChange = (e) => {
        const newYear = e.target.value;
        navigate(`/league/${id}/season/${newYear}`);
    };

    const handleRangeUpdate = async () => {
        setIsDynamicMode(true);
        setLoading(true);
        try {
            const res = await api.getDynamicStandings({
                league_id: id,
                season: year,
                from_round: rangeStart,
                to_round: rangeEnd
            });
            const dynamicData = res.map(t => ({
                ...t,
                group_name: `Custom Range (Rounds ${rangeStart}-${rangeEnd})`
            }));
            setStandings(dynamicData);
        } catch (err) {
            console.error("Dynamic fetch failed", err);
            setError("Failed to update standings.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-medium animate-pulse">Gathering V3 Intelligence...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100 dark:border-red-900/30">
                <span className="text-4xl mb-4 block">⚠️</span>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Analytics Offline</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button onClick={() => navigate('/import')} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                    Go to Import Tool
                </button>
            </div>
        </div>
    );

    if (!data) return null;

    const { league, topScorers, topAssists, topRated, availableYears } = data;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20 font-sans">

            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                        {/* League Identity */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600 p-2 flex items-center justify-center">
                                <img src={league.logo_url} alt={league.league_name} className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">V3 Analytics</span>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs text-slate-600 dark:text-slate-300 font-medium">
                                        <img src={league.flag_url} alt="" className="w-4 h-3 object-cover rounded-[1px]" />
                                        {league.country_name}
                                    </div>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{league.league_name}</h1>
                            </div>
                        </div>

                        {/* Season Selector */}
                        <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:block">Season Archive</label>
                            <select
                                value={year}
                                onChange={handleSeasonChange}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-slate-900 dark:text-white font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-right min-w-[120px]"
                            >
                                {(availableYears || [year]).map(y => (
                                    <option key={y} value={y}>{y} / {parseInt(y) + 1}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 mt-6 overflow-x-auto scrollbar-hide -mb-[17px]">
                        {[
                            { id: 'overview', icon: '💎', label: 'Overview' },
                            { id: 'standings', icon: '📊', label: 'Standings' },
                            { id: 'fixtures', icon: '📅', label: 'Results' },
                            { id: 'squads', icon: '👥', label: 'Squads' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap
                                    ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300'}
                                `}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {activeTab === 'overview' && (
                    <LeagueOverview
                        leagueId={id}
                        season={year}
                        standings={standings}
                        topScorers={topScorers}
                        topAssists={topAssists}
                        topRated={topRated}
                        teamSquad={teamSquad}
                        squadLoading={squadLoading}
                        selectedTeamId={selectedTeamId}
                        setSelectedTeamId={setSelectedTeamId}
                    />
                )}

                {activeTab === 'standings' && (
                    <StandingsTable
                        standings={standings}
                        rangeStart={rangeStart}
                        setRangeStart={setRangeStart}
                        rangeEnd={rangeEnd}
                        setRangeEnd={setRangeEnd}
                        handleRangeUpdate={handleRangeUpdate}
                        isDynamicMode={isDynamicMode}
                        loading={loading}
                    />
                )}

                {activeTab === 'fixtures' && (
                    <FixturesList
                        fixturesData={fixturesData}
                        selectedRound={selectedRound}
                        setSelectedRound={setSelectedRound}
                    />
                )}

                {activeTab === 'squads' && (
                    <SquadList
                        teams={standings}
                        selectedTeamId={selectedTeamId}
                        setSelectedTeamId={setSelectedTeamId}
                        squadLoading={squadLoading}
                        teamSquad={teamSquad}
                    />
                )}

            </main>
        </div>
    );
};

export default SeasonOverviewPage;
