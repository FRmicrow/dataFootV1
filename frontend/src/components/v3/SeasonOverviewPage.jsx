
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
                const [overviewRes, fixturesRes] = await Promise.all([
                    api.getSeasonOverview(id, targetYear),
                    api.getLeagueFixtures(id, targetYear)
                ]);

                setData(overviewRes);
                setStandings(overviewRes.standings || []);

                // Auto-set max round logic
                if (overviewRes.standings && overviewRes.standings.length > 0 && !isDynamicMode) {
                    const maxPlayed = Math.max(...overviewRes.standings.map(t => t.played || 0));
                    setRangeEnd(maxPlayed || 38);
                }

                setFixturesData(fixturesRes || { fixtures: [], rounds: [] });
                if (fixturesRes?.rounds?.length > 0) {
                    // Detect current round: first round that has unplayed matches, or the last one if all played
                    const allFixtures = fixturesRes.fixtures || [];
                    let current = fixturesRes.rounds[0];

                    // Find first round with a non-finished match
                    const firstUnplayed = allFixtures.find(f => f.status_short === 'NS' || f.status_short === 'TBD');
                    if (firstUnplayed) {
                        current = firstUnplayed.round;
                    } else if (allFixtures.length > 0) {
                        // If everything is played, pick the last round
                        current = allFixtures[allFixtures.length - 1].round;
                    }

                    setSelectedRound(current);
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
            <p className="font-medium animate-pulse">Scanning Competition Data...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100 dark:border-red-900/30">
                <span className="text-4xl mb-4 block">⚠️</span>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Data Hub Offline</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button onClick={() => navigate('/import')} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                    Go to Import Tool
                </button>
            </div>
        </div>
    );

    if (!data) return null;

    const { league, topScorers, topAssists, topRated, availableYears, isFinished, hallOfFame } = data;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20 font-sans">

            {/* Premium Header */}
            <header className="bg-white/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm backdrop-blur-md">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                        {/* League Identity */}
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600 p-2 flex items-center justify-center shrink-0">
                                <img src={league.logo_url} alt={league.league_name} className="w-full h-full object-contain" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-full text-[9px] text-slate-500 font-black border border-slate-100 dark:border-slate-700 uppercase tracking-tighter">
                                        <img src={league.flag_url} alt="" className="w-3 h-2 object-cover rounded-[1px]" />
                                        {league.country_name}
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${isFinished ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                                        {isFinished ? 'Completed' : 'Live'}
                                    </span>
                                </div>
                                <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none tracking-tight truncate">{league.league_name}</h1>
                            </div>
                        </div>

                        {/* Hall of Fame / Live Status Center */}
                        <div className="flex-1 flex justify-center lg:px-8">
                            {isFinished && hallOfFame ? (
                                <div className="flex items-center bg-slate-100/50 dark:bg-slate-900/40 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide max-w-2xl">
                                    {hallOfFame.winner && (
                                        <div className="flex items-center gap-2.5 border-r border-slate-200 dark:border-slate-700 px-4 whitespace-nowrap">
                                            <div className="w-6 h-6 bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-700">
                                                <img src={hallOfFame.winner.logo_url} alt="" className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">Champion</p>
                                                <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 leading-none">{hallOfFame.winner.name}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-col justify-center px-4 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                        <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">Scorer</p>
                                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-none">
                                            {hallOfFame.topScorer ? `${hallOfFame.topScorer.name}` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col justify-center px-4 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                        <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">Assist</p>
                                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-none">
                                            {hallOfFame.topAssister ? `${hallOfFame.topAssister.name}` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col justify-center px-4 whitespace-nowrap">
                                        <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">MVP</p>
                                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-none">
                                            {hallOfFame.bestPlayer ? `${hallOfFame.bestPlayer.name}` : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 bg-blue-500/5 px-4 py-1.5 rounded-full border border-blue-500/10">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">Season in Discovery Mode</p>
                                </div>
                            )}
                        </div>

                        {/* Season Selector */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <select
                                    value={year}
                                    onChange={handleSeasonChange}
                                    className="pl-4 pr-8 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-black cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-all outline-none appearance-none text-[10px] shadow-sm uppercase tracking-widest min-w-[120px]"
                                >
                                    {(availableYears || [year]).map(y => (
                                        <option key={y} value={y}>{y} / {parseInt(y) + 1}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">▼</div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-hide -mb-[13px]">
                        {[
                            { id: 'overview', icon: '💎', label: 'Overview' },
                            { id: 'standings', icon: '📊', label: 'Standings', hidden: league.type === 'Cup' },
                            { id: 'fixtures', icon: '📅', label: 'Results' },
                            { id: 'squads', icon: '👥', label: 'Squads' }
                        ].filter(t => !t.hidden).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 border-b-2 font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap
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
            <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">

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
