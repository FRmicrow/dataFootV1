import React, { useState } from 'react';
import {
    Card, Button, Badge, Grid, Stack,
    Tabs, Progress, MetricCard, ProfileHeader,
    LeagueCard, PlayerCard, FixtureRow, Select, Skeleton
} from '../../../../design-system';
import { PageLayout, PageHeader, PageContent } from '../../layouts';

const DesignSystemPage = () => {
    const [activeTab, setActiveTab] = useState('foundations');
    const [progressValue, setProgressValue] = useState(65);

    const colorTokens = [
        { name: '--color-primary-500', value: '#8b5cf6', desc: 'Main brand color (Purple)' },
        { name: '--color-blue-500', value: '#3b82f6', desc: 'Information & Primary actions (Blue)' },
        { name: '--color-accent-500', value: '#f59e0b', desc: 'Highlights & Featured stats' },
        { name: '--color-success-500', value: '#10b981', desc: 'Positive trends & Success states' },
        { name: '--color-danger-500', value: '#f43f5e', desc: 'Negative trends & Errors' },
        { name: '--color-slate-800', value: '#1e293b', desc: 'Surface background for cards' },
        { name: '--color-bg-main', value: '#0f172a', desc: 'Base page background' },
    ];

    const Sections = {
        foundations: (
            <Stack gap="var(--spacing-xl)">
                <section>
                    <h3 className="mb-md">Operational Protocols</h3>
                    <Card featured>
                        <Stack gap="var(--spacing-md)">
                            <Stack direction="row" gap="var(--spacing-sm)" align="center">
                                <span style={{ fontSize: 'var(--font-size-3xl)' }}>⚖️</span>
                                <div>
                                    <h4 style={{ margin: 0 }}>Token Enforcement Policy</h4>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                        All UI components MUST consume tokens from <code>tokens.css</code>.
                                        Hardcoded hex/rgba values are violations of the design system architecture.
                                    </p>
                                </div>
                            </Stack>
                            <Grid columns="repeat(3, 1fr)" gap="var(--spacing-lg)">
                                <Stack gap="var(--spacing-2xs)">
                                    <Badge variant="primary">Spacing</Badge>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>Use 12px incremental units: <code>var(--spacing-*)</code></p>
                                </Stack>
                                <Stack gap="var(--spacing-2xs)">
                                    <Badge variant="accent">Color Spectrum</Badge>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>Strict semantic mapping: <code>var(--color-*)</code></p>
                                </Stack>
                                <Stack gap="var(--spacing-2xs)">
                                    <Badge variant="success">Radius</Badge>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>Standardized corners: <code>var(--radius-*)</code></p>
                                </Stack>
                            </Grid>
                        </Stack>
                    </Card>
                </section>

                <section>
                    <h3 className="mb-md">Color Spectrum</h3>
                    <Grid columns="repeat(auto-fill, minmax(300px, 1fr))" gap="var(--spacing-md)">
                        {colorTokens.map(t => (
                            <Card key={t.name}>
                                <Stack direction="row" gap="var(--spacing-md)" align="center">
                                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', background: t.value, border: '1px solid var(--color-border)' }} />
                                    <Stack gap="2px">
                                        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-400)' }}>{t.name}</code>
                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{t.desc}</span>
                                    </Stack>
                                </Stack>
                            </Card>
                        ))}
                    </Grid>
                </section>
            </Stack>
        ),
        components: (
            <Stack gap="var(--spacing-xl)">
                <section>
                    <h3 className="mb-md">Atomic Actions</h3>
                    <Card>
                        <Stack direction="row" gap="var(--spacing-md)" wrap>
                            <Button variant="primary">Primary Ops</Button>
                            <Button variant="secondary">Intelligence View</Button>
                            <Button variant="ghost">Secondary</Button>
                            <Button variant="danger">Terminate</Button>
                            <Button loading>Syncing...</Button>
                            <Button disabled>Offline</Button>
                        </Stack>
                    </Card>
                </section>

                <section>
                    <h3 className="mb-md">Indicators & Signaling</h3>
                    <Grid columns="1fr 1fr" gap="var(--spacing-lg)">
                        <Card title="Signal Badges">
                            <Stack direction="row" gap="var(--spacing-xs)" wrap>
                                <Badge variant="primary">Tactical</Badge>
                                <Badge variant="accent">Elite Tier</Badge>
                                <Badge variant="success">Active</Badge>
                                <Badge variant="danger">Critical</Badge>
                                <Badge variant="warning">Alert</Badge>
                                <Badge variant="neutral">Archive</Badge>
                            </Stack>
                        </Card>
                        <Card title="Metric Visualization">
                            <Stack gap="var(--spacing-md)">
                                <Progress label="Sync Cycle" value={progressValue} showLabel />
                                <Progress label="Threat Level" value={90} variant="danger" size="sm" />
                                <Button size="xs" variant="secondary" onClick={() => setProgressValue(v => (v + 15) % 105)}>Update Cycle</Button>
                            </Stack>
                        </Card>
                    </Grid>
                </section>

                <section>
                    <h3 className="mb-md">Input & Selection</h3>
                    <Grid columns="1fr 1fr" gap="var(--spacing-lg)">
                        <Card title="Dropdowns">
                            <Select
                                options={[
                                    { value: 'all', label: 'All Leagues' },
                                    { value: 'top5', label: 'Top 5 Leagues' },
                                    { value: 'lower', label: 'Lower Divisions' }
                                ]}
                                value={{ value: 'top5', label: 'Top 5 Leagues' }}
                                onChange={() => { }}
                            />
                        </Card>
                        <Card title="Skeletons">
                            <Stack gap="var(--spacing-sm)">
                                <Skeleton width="100%" height="20px" />
                                <Skeleton width="80%" height="20px" />
                                <Skeleton width="100px" height="40px" circle />
                            </Stack>
                        </Card>
                    </Grid>
                </section>

                <section>
                    <h3 className="mb-md">High-Density Intelligence Widgets</h3>
                    <Grid columns="repeat(4, 1fr)" gap="var(--spacing-md)">
                        <MetricCard label="Total Vol" value="12.4M" trend={12} icon="💰" />
                        <MetricCard label="Tactical Uptime" value="99.9%" trend={0.2} icon="🔋" />
                        <MetricCard label="Active Nodes" value="2.4K" variant="featured" icon="🛡️" />
                        <Card loading padding="var(--spacing-md)">
                            <Skeleton height="60px" />
                        </Card>
                    </Grid>
                </section>

                <section>
                    <h3 className="mb-md">Data Tables</h3>
                    <Card padding="0">
                        <Table
                            header={[
                                { key: 'node', label: 'Processing Node' },
                                { key: 'status', label: 'State' },
                                { key: 'val', label: 'Load' },
                                { key: 'perf', label: 'Efficiency' }
                            ]}
                            data={[
                                { node: 'LDN-01', status: <Badge variant="success">Operational</Badge>, val: '1.2 GB/s', perf: '98%' },
                                { node: 'PAR-04', status: <Badge variant="warning">Syncing</Badge>, val: '800 MB/s', perf: '82%' },
                                { node: 'NYC-02', status: <Badge variant="danger">Locked</Badge>, val: '0', perf: '0%' }
                            ]}
                        />
                    </Card>
                </section>
            </Stack>
        ),
        layouts: (
            <Stack gap="var(--spacing-xl)">
                <section>
                    <h3 className="mb-md">Standard Header & Controls</h3>
                    <ControlBar
                        left={
                            <Tabs
                                items={[
                                    { id: 't1', label: 'Live Stream' },
                                    { id: 't2', label: 'Historical' }
                                ]}
                                activeId="t1"
                                onChange={() => { }}
                            />
                        }
                        right={
                            <Stack direction="row" gap="var(--spacing-md)">
                                <TeamSelector
                                    teams={[
                                        { id: 1, name: 'Man City', logo: 'https://media.api-sports.io/football/teams/50.png' },
                                        { id: 2, name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' }
                                    ]}
                                    onSelect={() => { }}
                                />
                                <Button variant="secondary" size="sm">Export Report</Button>
                            </Stack>
                        }
                    />
                </section>

                <section>
                    <h3 className="mb-md">Profile & Competition Headers</h3>
                    <Stack gap="var(--spacing-lg)">
                        <LeagueHeader
                            league={{
                                name: "Premier League",
                                logo_url: "https://media.api-sports.io/football/leagues/39.png",
                                rank: 1,
                                country: { name: "England" }
                            }}
                            activeSeason="2023"
                            seasonsCount={32}
                        />
                        <ProfileHeader
                            title="Manchester City"
                            image="https://media.api-sports.io/football/teams/50.png"
                            coverImage="https://media.api-sports.io/football/venues/556.png"
                            accentColor="#6CABDD"
                            badges={[{ label: 'Champion', variant: 'accent' }]}
                            stats={[
                                { label: 'Founded', value: '1880' },
                                { label: 'Capacity', value: '55,000' }
                            ]}
                        />
                    </Stack>
                </section>

                <section>
                    <h3 className="mb-md">Intelligence Visuals</h3>
                    <Grid columns="repeat(2, 1fr)" gap="var(--spacing-md)">
                        <LeagueCard
                            name="Premier League"
                            logo="https://media.api-sports.io/football/leagues/39.png"
                            rank={1}
                            seasonsCount={12}
                            countryName="England"
                            countryFlag="https://media.api-sports.io/flags/gb.svg"
                            featured
                        />
                        <PlayerCard
                            player={{
                                player_id: 1,
                                player_name: "Erling Haaland",
                                photo_url: "https://media.api-sports.io/football/players/1100.png"
                            }}
                            stats={{ goals: 36, assists: 8, rating: 8.4 }}
                        />
                    </Grid>
                </section>

                <section>
                    <h3 className="mb-md">Event Streams</h3>
                    <Card padding="0">
                        <FixtureRow
                            homeTeam={{ name: 'Man City', logo: 'https://media.api-sports.io/football/teams/50.png' }}
                            awayTeam={{ name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' }}
                            scoreHome={3}
                            scoreAway={3}
                            status="FT"
                            date={new Date().toISOString()}
                            aggregate="4 - 4"
                        />
                    </Card>
                </section>
            </Stack>
        )
    };

    return (
        <PageLayout className="ds-page animate-fade-in">
            <PageHeader
                title="StatFoot Command OS"
                subtitle="Standardized UI architecture for high-performance football intelligence. Design System V3."
                badge={{ label: "DS v3.0 ELITE", variant: "accent" }}
                extra={
                    <Stack direction="row" gap="var(--spacing-md)">
                        <Button variant="secondary" size="sm">Download Tokens</Button>
                        <Button variant="primary" size="sm">Submit Feedback</Button>
                    </Stack>
                }
            />

            <Tabs
                items={[
                    { id: 'foundations', label: '01. Foundations', icon: '💎' },
                    { id: 'components', label: '02. Components', icon: '⚙️' },
                    { id: 'layouts', label: '03. Layout Patterns', icon: '🖼️' },
                ]}
                activeId={activeTab}
                onChange={setActiveTab}
                className="mb-xl"
            />

            <PageContent>
                {Sections[activeTab]}

                <footer style={{ marginTop: 'var(--spacing-3xl)', padding: 'var(--spacing-xl) 0', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <div style={{ opacity: 0.3, marginBottom: 'var(--spacing-sm)', fontSize: '24px' }}>🛡️</div>
                    <p style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                        PROPRIETARY TACTICAL ENGINE • DESIGN SYSTEM V3
                    </p>
                </footer>
            </PageContent>
        </PageLayout>
    );
};

export default DesignSystemPage;
