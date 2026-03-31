import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { Card, Tabs, LeagueHeader, ControlBar, Skeleton, TableSkeleton } from '../../../../design-system';

// Corrected Absolute Isolation Imports
import PageLayoutV4 from '../../layouts/PageLayoutV4';
import PageContentV4 from '../../layouts/PageContentV4';

// Components (100% Isolated V4 Modules)
import LeagueOverviewV4 from '../../modules/league/LeagueOverviewV4';
import StandingsTableV4 from '../../modules/league/StandingsTableV4';
import FixturesListV4 from '../../modules/league/FixturesListV4';

// Design
import '../../../v3/pages/league/SeasonOverviewPage.css';

const SeasonOverviewPageV4 = () => {
    const { name, year } = useParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('standings');
    const [data, setData] = useState(null);
    const [standings, setStandings] = useState([]);
    const [fixturesData, setFixturesData] = useState({ fixtures: [], rounds: [] });
    const [selectedRound, setSelectedRound] = useState('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (!name || !year) {
                 setError("League name and season are required for V4 views.");
                 return;
            }

            const [overviewRes, fixturesRes] = await Promise.all([
                api.getSeasonOverviewV4(name, year),
                api.getFixturesV4(name, year)
            ]);

            setData(overviewRes);
            setStandings(overviewRes.standings || []);
            setFixturesData(fixturesRes || { fixtures: [], rounds: [] });

            if (fixturesRes?.rounds?.length > 0) {
                setSelectedRound(fixturesRes.rounds[0]);
            }

        } catch (err) {
            console.error("Error fetching V4 season analytics:", err);
            setError(err.message || "Failed to load V4 dashboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (name && year) fetchData();
    }, [name, year]);

    const handleSeasonChange = (e) => {
        const newYear = e.target.value;
        navigate(`/leagueV4/${name}/season/${newYear}`);
    };

    if (loading && !data) return (
        <PageLayoutV4>
            <div style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
                <Skeleton width="100%" height="100px" />
            </div>
            <PageContentV4>
                <TableSkeleton rows={10} cols={8} />
            </PageContentV4>
        </PageLayoutV4>
    );

    if (error) return (
        <div style={{ padding: '80px', textAlign: 'center' }}>
            <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
                <span style={{ fontSize: '48px' }}>⚠️</span>
                <h2 style={{ margin: '24px 0 12px' }}>V4 Data Error</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>{error}</p>
            </Card>
        </div>
    );

    if (!data) return null;

    const { league, topScorers, topAssists, topRated, availableYears } = data;

    const tabItems = [
        { id: 'overview', label: 'Player Insights', icon: '🔭' },
        { id: 'standings', label: 'Standings (V4)', icon: '📊' },
        { id: 'fixtures', label: 'Results', icon: '📅' }
    ];

    return (
        <PageLayoutV4 className="animate-fade-in">
            <LeagueHeader
                league={{
                    id: name,
                    name: league.league_name,
                    logo: 'https://tmssl.akamaized.net//images/logo/normal/tm.png',
                    country: { name: 'Historical Data (V4)' },
                    type: 'League'
                }}
                activeSeason={year}
                availableYears={availableYears || [year]}
                onYearChange={handleSeasonChange}
                syncing={false}
                onSync={() => {}}
            />

            <PageContentV4 style={{ marginTop: 'calc(var(--spacing-sm) * -1)' }}>
                <ControlBar
                    left={
                        <Tabs
                            items={tabItems}
                            activeId={activeTab}
                            onChange={setActiveTab}
                        />
                    }
                />

                <main className="season-tab-content">
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
                    {activeTab === 'standings' && (
                        <StandingsTableV4
                            standings={standings}
                            loading={loading}
                            isSplitView={false}
                            onToggleSplit={() => {}}
                        />
                    )}
                    {activeTab === 'fixtures' && (
                        <FixturesListV4
                            fixturesData={fixturesData}
                            selectedRound={selectedRound}
                            setSelectedRound={setSelectedRound}
                        />
                    )}
                </main>
            </PageContentV4>
        </PageLayoutV4>
    );
};

export default SeasonOverviewPageV4;
