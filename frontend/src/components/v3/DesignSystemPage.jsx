import React, { useState } from 'react';
import {
    Card, Button, Badge, Table, Grid, Stack,
    Tabs, Progress, MetricCard, ProfileHeader,
    LeagueCard, PlayerCard, FixtureRow
} from '../../design-system';

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

    const spacingTokens = [
        { name: '--spacing-3xs', value: '4px', desc: 'Micro adjustments' },
        { name: '--spacing-xs', value: '12px', desc: 'Base modular unit' },
        { name: '--spacing-md', value: '24px', desc: 'Standard grouping' },
        { name: '--spacing-xl', value: '48px', desc: 'Large container gaps' },
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
                    <h3 className="mb-md">High-Density Intelligence Widgets</h3>
                    <Grid columns="repeat(4, 1fr)" gap="var(--spacing-md)">
                        <MetricCard label="Total Vol" value="12.4M" trend={12} icon="💰" />
                        <MetricCard label="Tactical Uptime" value="99.9%" trend={0.2} icon="🔋" />
                        <MetricCard label="Active Nodes" value="2.4K" variant="featured" icon="🛡️" />
                        <MetricCard label="Analysis" value="..." loading />
                    </Grid>
                </section>
            </Stack>
        ),
        layouts: (
            <Stack gap="var(--spacing-xl)">
                <section>
                    <h3 className="mb-md">Domain: League & Competition</h3>
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
                        <LeagueCard
                            name="UEFA Champions League"
                            logo="https://media.api-sports.io/football/leagues/2.png"
                            rank={1}
                            isCup
                            seasonsCount={24}
                            countryName="Europe"
                        />
                    </Grid>
                </section>

                <section>
                    <h3 className="mb-md">Domain: Player Intelligence</h3>
                    <Grid columns="repeat(2, 1fr)" gap="var(--spacing-md)">
                        <PlayerCard
                            name="Kevin De Bruyne"
                            photo="https://media.api-sports.io/football/players/629.png"
                            position="Midfielder"
                            number={17}
                            appearances={24}
                            goals={5}
                            rating={8.1}
                        />
                        <PlayerCard
                            name="Erling Haaland"
                            photo="https://media.api-sports.io/football/players/1100.png"
                            position="Attacker"
                            number={9}
                            appearances={22}
                            goals={18}
                            rating={7.9}
                        />
                    </Grid>
                </section>

                <section>
                    <h3 className="mb-md">Domain: Tactical Schedule</h3>
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
                        <FixtureRow
                            homeTeam={{ name: 'Arsenal', logo: 'https://media.api-sports.io/football/teams/42.png' }}
                            awayTeam={{ name: 'Bayern Munich', logo: 'https://media.api-sports.io/football/teams/157.png' }}
                            scoreHome={2}
                            scoreAway={2}
                            status="LIVE"
                            date={new Date().toISOString()}
                            active
                        />
                    </Card>
                </section>

                <section>
                    <h3 className="mb-md">System Header Mapping</h3>
                    <ProfileHeader
                        title="Europa Conference League"
                        leagueId="2"
                        subtitles={['International', 'Europe', 'Tier #3']}
                        image="https://media.api-sports.io/football/leagues/3.png"
                        badges={[{ label: 'Continental', variant: 'primary' }]}
                        stats={[
                            { label: 'Modules', value: 32 },
                            { label: 'Avg Goals', value: '2.8' },
                            { label: 'Intensity', value: 'High' }
                        ]}
                        actions={<Button variant="primary">Sync Metrics</Button>}
                    />
                </section>
            </Stack>
        )
    };

    return (
        <div style={{ padding: 'var(--spacing-xl)', maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
            <header style={{ marginBottom: 'var(--spacing-2xl)' }}>
                <Badge variant="accent" style={{ marginBottom: 'var(--spacing-xs)' }}>DS v5.0 ELITE • TACTICAL ARCHITECTURE</Badge>
                <h1 style={{ fontSize: 'var(--font-size-5xl)', letterSpacing: '-0.05em', fontWeight: 900 }}>StatFoot Command OS</h1>
                <p style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-lg)', marginTop: 'var(--spacing-xs)', maxWidth: '800px' }}>
                    Standardized UI architecture for high-performance football intelligence.
                    Every component is engineered for density, legibility, and architectural integrity.
                </p>
            </header>

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

            <main>
                {Sections[activeTab]}
            </main>

            <footer style={{ marginTop: 'var(--spacing-3xl)', padding: 'var(--spacing-xl) 0', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                <div style={{ opacity: 0.3, marginBottom: 'var(--spacing-sm)', fontSize: '24px' }}>🛡️</div>
                <p style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    PROPRIETARY TACTICAL ENGINE • DESIGN SYSTEM V5.1
                </p>
            </footer>
        </div>
    );
};

export default DesignSystemPage;
