import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { Tabs, LeagueHeader, ControlBar, Skeleton, TableSkeleton } from '../../../../design-system';

import PageLayoutV4 from '../../layouts/PageLayoutV4';
import PageContentV4 from '../../layouts/PageContentV4';

import LeagueOverviewV4 from '../../modules/league/LeagueOverviewV4';
import StandingsTableV4 from '../../modules/league/StandingsTableV4';
import FixturesListV4 from '../../modules/league/FixturesListV4';
import SquadListV4 from '../../modules/league/SquadListV4';
import TitleRaceV4 from '../../modules/league/TitleRaceV4';
import XgAnalysisV4 from '../../modules/league/XgAnalysisV4';

import './SeasonOverviewPageV4.css';

const TAB_ITEMS = [
    { id: 'standings', label: 'Standings',      icon: '📊' },
    { id: 'fixtures',  label: 'Schedule',        icon: '📅' },
    { id: 'overview',  label: 'Player Insights', icon: '🔭' },
    { id: 'titlerace', label: 'Title Race',      icon: '🏁' },
    { id: 'xg',        label: 'xG Analysis',     icon: '🎯' },
    { id: 'squads',    label: 'Squads',           icon: '👥' },
];

const SeasonOverviewPageV4 = () => {
    const { name, year } = useParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('standings');

    // Core data — fetched on mount
    const [coreData, setCoreData] = useState(null);
    const [coreLoading, setCoreLoading] = useState(true);
    const [coreError, setCoreError] = useState(null);

    // Fixtures — lazy (fetched on first 'fixtures' or 'titlerace' activation)
    const [fixturesData, setFixturesData] = useState({ fixtures: [], rounds: [] });
    const [fixturesLoading, setFixturesLoading] = useState(false);
    const fixturesLoaded = useRef(false);
    const [selectedRound, setSelectedRound] = useState('');

    useEffect(() => {
        if (!name || !year) return;
        setCoreLoading(true);
        setCoreError(null);
        fixturesLoaded.current = false;
        api.getSeasonOverviewV4(name, year)
            .then(res => setCoreData(res))
            .catch(err => setCoreError(err.message || 'Failed to load'))
            .finally(() => setCoreLoading(false));
    }, [name, year]);

    // Lazy-load fixtures when standings/fixtures/titlerace tab first activated
    useEffect(() => {
        if (!['standings', 'fixtures', 'titlerace'].includes(activeTab)) return;
        if (fixturesLoaded.current) return;
        setFixturesLoading(true);
        api.getFixturesV4(name, year)
            .then(res => {
                const fd = res || { fixtures: [], rounds: [] };
                setFixturesData(fd);
                if (fd.rounds?.length > 0) setSelectedRound(fd.rounds[0]);
                fixturesLoaded.current = true;
            })
            .catch(() => { fixturesLoaded.current = true; })
            .finally(() => setFixturesLoading(false));
    }, [activeTab, name, year]);

    const handleSeasonChange = (e) => {
        navigate(`/leagues/${encodeURIComponent(name)}/season/${e.target.value}`);
    };

    if (coreLoading) return (
        <PageLayoutV4>
            <Skeleton width="100%" height="88px" style={{ borderRadius: 'var(--radius-xl)' }} />
            <TableSkeleton rows={20} cols={8} />
        </PageLayoutV4>
    );

    if (coreError) return (
        <PageLayoutV4>
            <div className="sov4-error">
                <span>⚠️</span>
                <p>{coreError}</p>
            </div>
        </PageLayoutV4>
    );

    if (!coreData) return null;

    const { league, topScorers, topAssists, topRated, availableYears } = coreData;
    const standings = coreData.standings || [];

    return (
        <div className="sov4-page animate-fade-in">
            <LeagueHeader
                league={{
                    id: name,
                    name: league.league_name,
                    logo: league.logo_url || 'https://tmssl.akamaized.net//images/logo/normal/tm.png',
                    country: { name: league.country_name || 'Historical Data (V4)' },
                    type: league.type || 'League'
                }}
                activeSeason={year}
                availableYears={availableYears || [year]}
                onYearChange={handleSeasonChange}
                syncing={false}
                onSync={() => {}}
            />

            <div className="sov4-body">
                <div className="sov4-tabbar">
                    <Tabs
                        items={TAB_ITEMS}
                        activeId={activeTab}
                        onChange={setActiveTab}
                    />
                </div>

                <div className="sov4-content">
                    {activeTab === 'standings' && (
                        <StandingsTableV4
                            standings={standings}
                            fixtures={fixturesData.fixtures}
                            loading={fixturesLoading}
                        />
                    )}
                    {activeTab === 'fixtures' && (
                        fixturesLoading
                            ? <TableSkeleton rows={10} cols={4} />
                            : <FixturesListV4
                                fixturesData={fixturesData}
                                selectedRound={selectedRound}
                                setSelectedRound={setSelectedRound}
                                league={name}
                                season={year}
                            />
                    )}
                    {activeTab === 'overview' && (
                        <LeagueOverviewV4
                            leagueId={name}
                            season={year}
                            standings={standings}
                            topScorers={topScorers}
                            topAssists={topAssists}
                            topRated={topRated}
                        />
                    )}
                    {activeTab === 'titlerace' && (
                        fixturesLoading
                            ? <TableSkeleton rows={5} cols={3} />
                            : <TitleRaceV4
                                standings={standings}
                                fixtures={fixturesData.fixtures}
                            />
                    )}
                    {activeTab === 'xg' && (
                        <XgAnalysisV4 league={name} season={year} />
                    )}
                    {activeTab === 'squads' && (
                        <SquadListV4
                            league={name}
                            season={year}
                            teams={standings}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeasonOverviewPageV4;
