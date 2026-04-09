import React, { useState } from 'react';
import {
    Card, Button, Badge, Grid, Stack,
    Tabs, Progress, MetricCard, ProfileHeader,
    LeagueCard, PlayerCard, FixtureRow, Select,
    Skeleton, CardSkeleton, MetricCardSkeleton, TableSkeleton,
    ControlBar, Table, TeamSelector, LeagueHeader,
    Input, Accordion, Navbar, CollapsibleSidebar,
} from '../../../../design-system';
import { PageLayout, PageHeader, PageContent } from '../../layouts';

/* ─── Token showcase helpers ────────────────────────────────────── */

const colorTokens = [
    { name: '--color-primary-500', hex: '#8b5cf6', label: 'Brand',    desc: 'Actions, highlights, focus' },
    { name: '--color-blue-500',    hex: '#3b82f6', label: 'Info',     desc: 'Informational states' },
    { name: '--color-accent-500',  hex: '#f59e0b', label: 'Accent',   desc: 'Featured stats, gold tier' },
    { name: '--color-success-500', hex: '#10b981', label: 'Success',  desc: 'Positive trends, wins' },
    { name: '--color-danger-500',  hex: '#f43f5e', label: 'Danger',   desc: 'Errors, losses, alerts' },
    { name: '--color-warning-500', hex: '#f97316', label: 'Warning',  desc: 'Caution, pending states' },
    { name: '--color-bg-main',     hex: '#0f172a', label: 'BG Main',  desc: 'Page background' },
    { name: '--color-bg-card',     hex: 'rgba(30,41,59,.7)', label: 'BG Card', desc: 'Card surfaces' },
];

const spacingTokens = [
    { name: '--spacing-3xs', size: '4px' },
    { name: '--spacing-2xs', size: '8px' },
    { name: '--spacing-xs',  size: '12px' },
    { name: '--spacing-sm',  size: '18px' },
    { name: '--spacing-md',  size: '24px' },
    { name: '--spacing-lg',  size: '36px' },
    { name: '--spacing-xl',  size: '48px' },
    { name: '--spacing-2xl', size: '72px' },
];

const radiusTokens = [
    { name: '--radius-xs',   px: '4px' },
    { name: '--radius-sm',   px: '8px' },
    { name: '--radius-md',   px: '12px' },
    { name: '--radius-lg',   px: '16px' },
    { name: '--radius-xl',   px: '24px' },
    { name: '--radius-full', px: '9999px' },
];

const typographyScale = [
    { name: '--font-size-xs',   size: '12px', label: 'Caption / Meta' },
    { name: '--font-size-sm',   size: '14px', label: 'Body Small' },
    { name: '--font-size-base', size: '16px', label: 'Body' },
    { name: '--font-size-lg',   size: '18px', label: 'Lead / Brand' },
    { name: '--font-size-xl',   size: '20px', label: 'Section Title' },
    { name: '--font-size-2xl',  size: '24px', label: 'Card Heading' },
    { name: '--font-size-4xl',  size: '36px', label: 'Page Title' },
];

/* ─── Section label ─────────────────────────────────────────────── */
const SectionTitle = ({ children }) => (
    <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--color-text-main)' }}>
        {children}
    </h3>
);

const TokenLabel = ({ name }) => (
    <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-400)', display: 'block', marginBottom: '2px' }}>
        {name}
    </code>
);

/* ─── Sections ───────────────────────────────────────────────────── */

const FoundationsSection = () => (
    <Stack gap="var(--spacing-2xl)">
        {/* Colors */}
        <section>
            <SectionTitle>Color Tokens</SectionTitle>
            <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap="var(--spacing-sm)">
                {colorTokens.map(t => (
                    <Card key={t.name}>
                        <Stack direction="row" gap="var(--spacing-md)" align="center">
                            <div style={{
                                width: 44, height: 44, flexShrink: 0,
                                borderRadius: 'var(--radius-sm)',
                                background: t.hex,
                                border: '1px solid var(--color-border)',
                            }} />
                            <Stack gap="2px">
                                <TokenLabel name={t.name} />
                                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{t.label}</span>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>{t.desc}</span>
                            </Stack>
                        </Stack>
                    </Card>
                ))}
            </Grid>
        </section>

        {/* Gradients */}
        <section>
            <SectionTitle>Gradients</SectionTitle>
            <Grid columns="repeat(3, 1fr)" gap="var(--spacing-md)">
                {[
                    { name: '--gradient-primary', label: 'Primary' },
                    { name: '--gradient-dark',    label: 'Dark surface' },
                    { name: '--gradient-surface', label: 'Surface lift' },
                ].map(g => (
                    <Card key={g.name} padding="0">
                        <div style={{ height: 64, background: `var(${g.name})`, borderRadius: 'var(--radius-md) var(--radius-md) 0 0' }} />
                        <div style={{ padding: 'var(--spacing-sm)' }}>
                            <TokenLabel name={g.name} />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>{g.label}</span>
                        </div>
                    </Card>
                ))}
            </Grid>
        </section>

        {/* Typography */}
        <section>
            <SectionTitle>Typography Scale</SectionTitle>
            <Card>
                <Stack gap="var(--spacing-md)">
                    {typographyScale.map(t => (
                        <Stack key={t.name} direction="row" align="baseline" gap="var(--spacing-lg)">
                            <span style={{ width: 180, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', flexShrink: 0 }}>
                                <code style={{ color: 'var(--color-primary-400)' }}>{t.name}</code>
                                <span style={{ display: 'block', color: 'var(--color-text-dim)' }}>{t.size}</span>
                            </span>
                            <span style={{ fontSize: t.size, fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.2 }}>
                                {t.label}
                            </span>
                        </Stack>
                    ))}
                </Stack>
            </Card>
        </section>

        {/* Spacing */}
        <section>
            <SectionTitle>Spacing Scale</SectionTitle>
            <Card>
                <Stack gap="var(--spacing-sm)">
                    {spacingTokens.map(t => (
                        <Stack key={t.name} direction="row" align="center" gap="var(--spacing-lg)">
                            <span style={{ width: 180, flexShrink: 0 }}>
                                <TokenLabel name={t.name} />
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>{t.size}</span>
                            </span>
                            <div style={{
                                height: 12,
                                width: t.size,
                                background: 'var(--color-primary-500)',
                                borderRadius: 'var(--radius-full)',
                                opacity: 0.7,
                            }} />
                        </Stack>
                    ))}
                </Stack>
            </Card>
        </section>

        {/* Border Radius */}
        <section>
            <SectionTitle>Border Radius</SectionTitle>
            <Grid columns="repeat(auto-fill, minmax(160px, 1fr))" gap="var(--spacing-md)">
                {radiusTokens.map(t => (
                    <Card key={t.name}>
                        <div style={{
                            width: 56, height: 56,
                            background: 'var(--color-primary-bg)',
                            border: '2px solid var(--color-primary-500)',
                            borderRadius: t.px,
                            margin: '0 auto var(--spacing-sm)',
                        }} />
                        <TokenLabel name={t.name} />
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)' }}>{t.px}</span>
                    </Card>
                ))}
            </Grid>
        </section>

        {/* Shadows */}
        <section>
            <SectionTitle>Elevation & Shadows</SectionTitle>
            <Grid columns="repeat(auto-fill, minmax(200px, 1fr))" gap="var(--spacing-md)">
                {[
                    { name: '--shadow-sm',      label: 'Subtle' },
                    { name: '--shadow-md',      label: 'Card' },
                    { name: '--shadow-lg',      label: 'Floating' },
                    { name: '--shadow-premium', label: 'Premium' },
                    { name: '--glow-primary',   label: 'Glow' },
                ].map(s => (
                    <div key={s.name} style={{
                        background: 'var(--color-bg-card)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)',
                        boxShadow: `var(${s.name})`,
                        border: '1px solid var(--color-border)',
                    }}>
                        <TokenLabel name={s.name} />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{s.label}</span>
                    </div>
                ))}
            </Grid>
        </section>
    </Stack>
);

const ComponentsSection = ({ progressValue, setProgressValue }) => (
    <Stack gap="var(--spacing-2xl)">
        {/* Buttons */}
        <section>
            <SectionTitle>Buttons</SectionTitle>
            <Card>
                <Stack gap="var(--spacing-md)">
                    <Stack direction="row" gap="var(--spacing-sm)" wrap>
                        <Button variant="primary">Primary</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="danger">Danger</Button>
                        <Button loading>Loading…</Button>
                        <Button disabled>Disabled</Button>
                    </Stack>
                    <Stack direction="row" gap="var(--spacing-sm)" wrap>
                        <Button variant="primary" size="sm">Small</Button>
                        <Button variant="primary" size="md">Medium</Button>
                        <Button variant="primary" size="lg">Large</Button>
                    </Stack>
                </Stack>
            </Card>
        </section>

        {/* Badges */}
        <section>
            <SectionTitle>Badges</SectionTitle>
            <Card>
                <Stack direction="row" gap="var(--spacing-xs)" wrap>
                    <Badge variant="primary">Primary</Badge>
                    <Badge variant="accent">Accent</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="danger">Danger</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="neutral">Neutral</Badge>
                </Stack>
            </Card>
        </section>

        {/* Progress */}
        <section>
            <SectionTitle>Progress</SectionTitle>
            <Grid columns="1fr 1fr" gap="var(--spacing-lg)">
                <Card title="Progress bars">
                    <Stack gap="var(--spacing-md)">
                        <Progress label="Default" value={progressValue} showLabel />
                        <Progress label="Success" value={72} variant="success" showLabel />
                        <Progress label="Danger" value={90} variant="danger" size="sm" showLabel />
                        <Button size="xs" variant="secondary" onClick={() => setProgressValue(v => (v + 15) % 105)}>
                            Animate
                        </Button>
                    </Stack>
                </Card>
                <Card title="Metric Cards">
                    <Stack gap="var(--spacing-sm)">
                        <MetricCard label="Goals / 90"   value="1.42" trend={8}    icon="⚽" />
                        <MetricCard label="xG Total"     value="38.7" trend={-2}   icon="📊" />
                        <MetricCard label="Clean Sheets" value="14"   variant="featured" icon="🛡️" />
                    </Stack>
                </Card>
            </Grid>
        </section>

        {/* Inputs */}
        <section>
            <SectionTitle>Inputs & Forms</SectionTitle>
            <Grid columns="1fr 1fr" gap="var(--spacing-lg)">
                <Card title="Text input">
                    <Stack gap="var(--spacing-sm)">
                        <Input placeholder="Search player…" label="Player" />
                        <Input placeholder="Disabled" label="League" disabled />
                    </Stack>
                </Card>
                <Card title="Select">
                    <Select
                        options={[
                            { value: 'all',  label: 'All Leagues' },
                            { value: 'top5', label: 'Top 5 Leagues' },
                            { value: 'low',  label: 'Lower Divisions' },
                        ]}
                        value={{ value: 'top5', label: 'Top 5 Leagues' }}
                        onChange={() => { }}
                    />
                </Card>
            </Grid>
        </section>

        {/* Skeleton */}
        <section>
            <SectionTitle>Skeleton Loaders</SectionTitle>
            <Grid columns="1fr 1fr" gap="var(--spacing-lg)">
                <Card title="Lines">
                    <Stack gap="var(--spacing-sm)">
                        <Skeleton width="100%" height="16px" />
                        <Skeleton width="75%"  height="16px" />
                        <Skeleton width="50%"  height="16px" />
                    </Stack>
                </Card>
                <Card title="Shapes">
                    <Stack direction="row" gap="var(--spacing-md)" align="center">
                        <Skeleton width="48px" height="48px" circle />
                        <Stack gap="var(--spacing-xs)" style={{ flex: 1 }}>
                            <Skeleton width="100%" height="14px" />
                            <Skeleton width="60%"  height="14px" />
                        </Stack>
                    </Stack>
                </Card>
            </Grid>
        </section>

        {/* Table */}
        <section>
            <SectionTitle>Table</SectionTitle>
            <Card padding="0">
                <Table
                    columns={[
                        { key: 'player', title: 'Player', dataIndex: 'player' },
                        { key: 'club',   title: 'Club',   dataIndex: 'club' },
                        { key: 'goals',  title: 'Goals',  dataIndex: 'goals' },
                        { key: 'rating', title: 'Rating', dataIndex: 'rating' },
                        { key: 'status', title: 'Status', dataIndex: 'status', render: (val) => val },
                    ]}
                    data={[
                        { player: 'E. Haaland',  club: 'Man City',    goals: 36, rating: '8.4', status: <Badge variant="success">Active</Badge> },
                        { player: 'K. Mbappé',   club: 'Real Madrid', goals: 28, rating: '8.1', status: <Badge variant="success">Active</Badge> },
                        { player: 'V. Osimhen',  club: 'Napoli',      goals: 18, rating: '7.6', status: <Badge variant="warning">Injury</Badge> },
                    ]}
                    rowKey="player"
                />
            </Card>
        </section>
    </Stack>
);

const LayoutsSection = () => {
    const [activeTabInner, setActiveTabInner] = useState('t1');

    return (
        <Stack gap="var(--spacing-2xl)">
            {/* Tabs */}
            <section>
                <SectionTitle>Tabs</SectionTitle>
                <Tabs
                    items={[
                        { id: 't1', label: 'Overview',   icon: '📊' },
                        { id: 't2', label: 'Historical', icon: '📅' },
                        { id: 't3', label: 'Advanced',   icon: '⚙️' },
                    ]}
                    activeId={activeTabInner}
                    onChange={setActiveTabInner}
                />
            </section>

            {/* ControlBar */}
            <section>
                <SectionTitle>ControlBar</SectionTitle>
                <ControlBar
                    left={
                        <Tabs
                            items={[
                                { id: 'live', label: 'Live' },
                                { id: 'hist', label: 'Historical' },
                            ]}
                            activeId="live"
                            onChange={() => { }}
                        />
                    }
                    right={
                        <Stack direction="row" gap="var(--spacing-md)" align="center">
                            <Button variant="secondary" size="sm">Export</Button>
                        </Stack>
                    }
                />
            </section>

            {/* Team Selector */}
            <section>
                <SectionTitle>Team Selector</SectionTitle>
                <div style={{ maxWidth: 280 }}>
                    <TeamSelector
                        teams={[
                            { team_id: 50,  team_name: 'Man City',    team_logo: 'https://media.api-sports.io/football/teams/50.png',  rank: 1 },
                            { team_id: 541, team_name: 'Real Madrid', team_logo: 'https://media.api-sports.io/football/teams/541.png', rank: 2 },
                            { team_id: 165, team_name: 'Dortmund',    team_logo: 'https://media.api-sports.io/football/teams/165.png', rank: 3 },
                        ]}
                        selectedTeamId={50}
                        onSelect={() => {}}
                        searchTerm=""
                        onSearchChange={() => {}}
                    />
                </div>
            </section>

            {/* League Header */}
            <section>
                <SectionTitle>League Header</SectionTitle>
                <Stack gap="var(--spacing-md)">
                    <LeagueHeader
                        league={{
                            id: 39,
                            name: 'Premier League',
                            logo_url: 'https://media.api-sports.io/football/leagues/39.png',
                            rank: 1,
                            country_name: 'England',
                            type: 'League',
                        }}
                        activeSeason="2024"
                        seasonsCount={32}
                        availableYears={['2024', '2023', '2022', '2021']}
                        onYearChange={() => {}}
                        onSync={() => {}}
                        syncing={false}
                    />
                    <Card title="LeagueHeader — Props reference" ghost>
                        <PropsTable>
                            <Prop name="league"         type="object" desc="League object: id, name, logo_url, rank, country_name, type" />
                            <Prop name="activeSeason"   type="string" desc="Currently selected season year" />
                            <Prop name="seasonsCount"   type="number" desc="Total seasons imported" />
                            <Prop name="availableYears" type="array"  desc="List of season years for the year selector" />
                            <Prop name="onYearChange"   type="func"   desc="Called with event on year select change" />
                            <Prop name="onSync"         type="func"   desc="Triggers data sync for the current season" />
                            <Prop name="syncing"        type="bool"   def="false" desc="Shows spinning icon on sync button" />
                        </PropsTable>
                    </Card>
                </Stack>
            </section>

            {/* Profile Header */}
            <section>
                <SectionTitle>Profile Header</SectionTitle>
                <ProfileHeader
                    title="Manchester City"
                    image="https://media.api-sports.io/football/teams/50.png"
                    coverImage="https://media.api-sports.io/football/venues/556.png"
                    accentColor="#6CABDD"
                    badges={[{ label: 'Champion', variant: 'accent' }]}
                    stats={[
                        { label: 'Founded',  value: '1880' },
                        { label: 'Capacity', value: '55,000' },
                    ]}
                />
            </section>

            {/* Cards */}
            <section>
                <SectionTitle>Data Cards</SectionTitle>
                <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-md)">
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
                            player_name: 'Erling Haaland',
                            photo_url: 'https://media.api-sports.io/football/players/1100.png',
                        }}
                        stats={{ goals: 36, assists: 8, rating: 8.4 }}
                    />
                </Grid>
            </section>

            {/* Fixture Row */}
            <section>
                <SectionTitle>Fixture Row</SectionTitle>
                <Stack gap="var(--spacing-md)">
                    <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Standard — with xG bars
                        </p>
                        <Card padding="0">
                            <FixtureRow
                                homeTeam={{ name: 'Man City',    logo: 'https://media.api-sports.io/football/teams/50.png' }}
                                awayTeam={{ name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' }}
                                scoreHome={3}
                                scoreAway={3}
                                xgHome={2.4}
                                xgAway={1.8}
                                status="FT"
                                date={new Date().toISOString()}
                                aggregate="4 - 4"
                            />
                        </Card>
                    </div>
                    <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Compact — no xG, names wrap (split-view)
                        </p>
                        <Card padding="0">
                            <FixtureRow
                                homeTeam={{ name: 'Borussia Dortmund', logo: 'https://media.api-sports.io/football/teams/165.png' }}
                                awayTeam={{ name: 'Bayern München',    logo: 'https://media.api-sports.io/football/teams/157.png' }}
                                scoreHome={1}
                                scoreAway={2}
                                status="FT"
                                date={new Date().toISOString()}
                                compact
                            />
                        </Card>
                    </div>
                    <Card title="FixtureRow — Props reference" ghost>
                        <PropsTable>
                            <Prop name="homeTeam"   type="object" desc="{ name, logo } — home team" />
                            <Prop name="awayTeam"   type="object" desc="{ name, logo } — away team" />
                            <Prop name="scoreHome"  type="number" desc="Home score (null = not started)" />
                            <Prop name="scoreAway"  type="number" desc="Away score" />
                            <Prop name="xgHome"     type="number" desc="Home xG — shows bar when both sides provided" />
                            <Prop name="xgAway"     type="number" desc="Away xG" />
                            <Prop name="status"     type="string" desc="Match status short code: FT, HT, NS, LIVE…" />
                            <Prop name="date"       type="string" desc="ISO date string (kickoff time)" />
                            <Prop name="aggregate"  type="string" desc="Tie aggregate score label" />
                            <Prop name="compact"    type="bool"   def="false" desc="5-column layout, hides xG, wraps team names" />
                            <Prop name="onClick"    type="func"   desc="Navigate to match detail" />
                        </PropsTable>
                    </Card>
                </Stack>
            </section>

            {/* Navbar */}
            <section>
                <SectionTitle>Navbar</SectionTitle>
                <Stack gap="var(--spacing-md)">
                    <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <Navbar />
                    </div>
                    <Card ghost>
                        <Badge variant="warning" style={{ marginBottom: 'var(--spacing-xs)' }}>Deprecated</Badge>
                        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)' }}>
                            <code>Navbar</code> is the legacy horizontal top bar. Use <code>CollapsibleSidebar</code> for all new layouts — it replaces Navbar with a collapsible vertical navigation.
                        </p>
                    </Card>
                </Stack>
            </section>

            {/* CollapsibleSidebar */}
            <section>
                <SectionTitle>CollapsibleSidebar</SectionTitle>
                <Stack gap="var(--spacing-md)">
                    <div style={{ height: 360, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', display: 'flex', position: 'relative' }}>
                        <CollapsibleSidebar
                            navItems={[
                                { to: '/dashboard',        label: 'Dashboard',  icon: '🏠' },
                                { to: '/leagues',          label: 'Leagues',    icon: '🏆' },
                                { to: '/search',           label: 'Search',     icon: '🔍' },
                                { to: '/machine-learning', label: 'ML Hub',     icon: '🤖' },
                                { to: '/system/design',    label: 'Design System', icon: '🎨' },
                            ]}
                        />
                        <div style={{ flex: 1, padding: 'var(--spacing-md)', background: 'var(--color-bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)' }}>← Main content area</span>
                        </div>
                    </div>
                    <Card title="CollapsibleSidebar — Props reference" ghost>
                        <PropsTable>
                            <Prop name="navItems" type="array" desc="[{ to, label, icon }] — navigation links; icon is an emoji or node" />
                        </PropsTable>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-sm)', margin: 'var(--spacing-sm) 0 0' }}>
                            Collapse state is managed internally. The component toggles <code>sidebar-collapsed</code> on <code>document.body</code> so the main layout can react via CSS.
                        </p>
                    </Card>
                </Stack>
            </section>
        </Stack>
    );
};

/* ─── Prop badge helper ──────────────────────────────────────────── */
const Prop = ({ name, type, def, desc }) => (
    <tr>
        <td><code style={{ color: 'var(--color-primary-400)', fontSize: 'var(--font-size-xs)' }}>{name}</code></td>
        <td><code style={{ color: 'var(--color-accent-400)', fontSize: 'var(--font-size-xs)' }}>{type}</code></td>
        <td style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-xs)' }}>{def ?? '—'}</td>
        <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>{desc}</td>
    </tr>
);

const PropsTable = ({ children }) => (
    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
            <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Prop', 'Type', 'Default', 'Description'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--color-text-dim)', fontWeight: 600 }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    </div>
);

/* ─── Patterns section ───────────────────────────────────────────── */
const PatternsSection = () => {
    const [cardInteracted, setCardInteracted] = useState(false);

    return (
        <Stack gap="var(--spacing-2xl)">

            {/* ── Card variants ── */}
            <section>
                <SectionTitle>Card</SectionTitle>
                <Stack gap="var(--spacing-lg)">
                    <Grid columns="repeat(auto-fill, minmax(260px, 1fr))" gap="var(--spacing-md)">
                        {/* Default */}
                        <Card title="Default" subtitle="Standard surface with header">
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)', margin: 0 }}>
                                Base card with <code>title</code> + <code>subtitle</code>.
                            </p>
                        </Card>

                        {/* Ghost */}
                        <Card ghost title="Ghost" subtitle="No background fill">
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)', margin: 0 }}>
                                Use <code>ghost</code> for low-emphasis containers.
                            </p>
                        </Card>

                        {/* Interactive */}
                        <Card
                            title={cardInteracted ? '✅ Clicked!' : 'Interactive'}
                            subtitle="Click me"
                            onClick={() => setCardInteracted(c => !c)}
                        >
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)', margin: 0 }}>
                                Pass <code>onClick</code> for keyboard + pointer interaction.
                            </p>
                        </Card>

                        {/* With extra */}
                        <Card
                            title="With Extra"
                            extra={<Badge variant="accent">NEW</Badge>}
                            footer={
                                <Stack direction="row" gap="var(--spacing-xs)" justify="flex-end">
                                    <Button variant="ghost" size="sm">Cancel</Button>
                                    <Button variant="primary" size="sm">Save</Button>
                                </Stack>
                            }
                        >
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)', margin: 0 }}>
                                Card with <code>extra</code> slot (header right) and <code>footer</code>.
                            </p>
                        </Card>

                        {/* With titleLogo */}
                        <Card
                            titleLogo={<img src="https://media.api-sports.io/football/leagues/39.png" alt="" style={{ width: 28, height: 28 }} />}
                            title="With titleLogo"
                            subtitle="Premier League · England"
                        >
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-dim)', margin: 0 }}>
                                Use <code>titleLogo</code> for entity icons in the header.
                            </p>
                        </Card>
                    </Grid>

                    <Card title="Card — Props reference" ghost>
                        <PropsTable>
                            <Prop name="title"      type="node"   desc="Header title — string or JSX" />
                            <Prop name="subtitle"   type="string" desc="Muted line below title" />
                            <Prop name="titleLogo"  type="node"   desc="Icon/image left of title" />
                            <Prop name="extra"      type="node"   desc="Slot top-right of header" />
                            <Prop name="footer"     type="node"   desc="Slot at card bottom" />
                            <Prop name="ghost"      type="bool"   def="false" desc="Borderless, no background" />
                            <Prop name="onClick"    type="func"   desc="Makes card interactive (keyboard + hover)" />
                            <Prop name="className"  type="string" desc="Extra CSS class" />
                        </PropsTable>
                    </Card>
                </Stack>
            </section>

            {/* ── Accordion ── */}
            <section>
                <SectionTitle>Accordion</SectionTitle>
                <Stack gap="var(--spacing-sm)">
                    <Accordion title="Default — click to expand">
                        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            Content area revealed on toggle. Scrollable with <code>maxHeight</code> prop.
                        </p>
                    </Accordion>

                    <Accordion title="Pre-expanded" defaultExpanded>
                        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            Use <code>defaultExpanded</code> to open on mount.
                        </p>
                    </Accordion>

                    <Accordion
                        title={
                            <Stack direction="row" gap="var(--spacing-xs)" align="center">
                                <Badge variant="primary">Custom</Badge>
                                <span style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>JSX title node</span>
                            </Stack>
                        }
                        headerRight={<Button variant="secondary" size="sm">Action</Button>}
                    >
                        <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            <code>title</code> accepts any JSX. <code>headerRight</code> renders a persistent right slot.
                        </p>
                    </Accordion>

                    <Card title="Accordion — Props reference" ghost>
                        <PropsTable>
                            <Prop name="title"           type="node"   desc="Toggle label — string or JSX" />
                            <Prop name="headerRight"     type="node"   desc="Persistent slot right of toggle (e.g. button)" />
                            <Prop name="defaultExpanded" type="bool"   def="false" desc="Open on initial render" />
                            <Prop name="maxHeight"       type="string" def="400px" desc="Max height of content area (scrollable)" />
                            <Prop name="children"        type="node"   desc="Content revealed when expanded" />
                        </PropsTable>
                    </Card>
                </Stack>
            </section>

            {/* ── Skeleton named exports ── */}
            <section>
                <SectionTitle>Skeleton — Compound loaders</SectionTitle>
                <Grid columns="repeat(auto-fill, minmax(280px, 1fr))" gap="var(--spacing-md)">
                    <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            &lt;CardSkeleton /&gt;
                        </p>
                        <CardSkeleton />
                    </div>
                    <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            &lt;MetricCardSkeleton /&gt;
                        </p>
                        <MetricCardSkeleton />
                    </div>
                    <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-xs)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            &lt;TableSkeleton rows=3 cols=4 /&gt;
                        </p>
                        <TableSkeleton rows={3} cols={4} />
                    </div>
                </Grid>
            </section>

            {/* ── Grid ── */}
            <section>
                <SectionTitle>Grid</SectionTitle>
                <Stack gap="var(--spacing-lg)">
                    <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-sm)' }}>
                            <code>columns="repeat(3, 1fr)"</code>
                        </p>
                        <Grid columns="repeat(3, 1fr)" gap="var(--spacing-sm)">
                            {[1, 2, 3].map(n => (
                                <div key={n} style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-500)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md)', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-400)' }}>
                                    Item {n}
                                </div>
                            ))}
                        </Grid>
                    </div>
                    <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-sm)' }}>
                            <code>columns="repeat(auto-fill, minmax(160px, 1fr))"</code> — responsive
                        </p>
                        <Grid columns="repeat(auto-fill, minmax(160px, 1fr))" gap="var(--spacing-sm)">
                            {[1, 2, 3, 4, 5].map(n => (
                                <div key={n} style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-500)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-md)', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-400)' }}>
                                    Item {n}
                                </div>
                            ))}
                        </Grid>
                    </div>
                    <Card title="Grid — Props reference" ghost>
                        <PropsTable>
                            <Prop name="columns"   type="string" def="repeat(auto-fill, minmax(300px, 1fr))" desc="CSS grid-template-columns" />
                            <Prop name="gap"       type="string" def="var(--spacing-sm)" desc="Gap between cells" />
                            <Prop name="className" type="string" desc="Extra CSS class" />
                        </PropsTable>
                    </Card>
                </Stack>
            </section>

            {/* ── Stack ── */}
            <section>
                <SectionTitle>Stack</SectionTitle>
                <Stack gap="var(--spacing-lg)">
                    <Grid columns="1fr 1fr" gap="var(--spacing-md)">
                        <Card title='direction="column" (default)'>
                            <Stack gap="var(--spacing-xs)">
                                {['Alpha', 'Beta', 'Gamma'].map(l => (
                                    <div key={l} style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' }}>{l}</div>
                                ))}
                            </Stack>
                        </Card>
                        <Card title='direction="row"'>
                            <Stack direction="row" gap="var(--spacing-xs)">
                                {['Alpha', 'Beta', 'Gamma'].map(l => (
                                    <div key={l} style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)' }}>{l}</div>
                                ))}
                            </Stack>
                        </Card>
                        <Card title='align="center" + justify="space-between"'>
                            <Stack direction="row" align="center" justify="space-between">
                                <Badge variant="primary">Left</Badge>
                                <Badge variant="accent">Center stretch</Badge>
                                <Badge variant="success">Right</Badge>
                            </Stack>
                        </Card>
                        <Card title='dense — tighter gap'>
                            <Stack dense>
                                {['One', 'Two', 'Three', 'Four'].map(l => (
                                    <div key={l} style={{ padding: 'var(--spacing-2xs) var(--spacing-sm)', background: 'var(--color-bg-card)', borderRadius: 'var(--radius-xs)', fontSize: 'var(--font-size-xs)' }}>{l}</div>
                                ))}
                            </Stack>
                        </Card>
                    </Grid>
                    <Card title="Stack — Props reference" ghost>
                        <PropsTable>
                            <Prop name="direction" type="'row'|'column'" def="column"                  desc="Flex direction" />
                            <Prop name="row"       type="bool"           def="false"                   desc="Shorthand for direction='row'" />
                            <Prop name="gap"       type="string"         def="var(--spacing-xs)"       desc="Gap between children" />
                            <Prop name="dense"     type="bool"           def="false"                   desc="Override gap to --spacing-2xs" />
                            <Prop name="align"     type="string"         def="stretch"                 desc="CSS align-items" />
                            <Prop name="justify"   type="string"         def="flex-start"              desc="CSS justify-content" />
                            <Prop name="className" type="string"         desc="Extra CSS class" />
                        </PropsTable>
                    </Card>
                </Stack>
            </section>

        </Stack>
    );
};

/* ─── Page ───────────────────────────────────────────────────────── */

const DesignSystemPage = () => {
    const [activeTab, setActiveTab] = useState('foundations');
    const [progressValue, setProgressValue] = useState(65);

    const tabs = [
        { id: 'foundations', label: '01 · Foundations', icon: '💎' },
        { id: 'components',  label: '02 · Components',  icon: '⚙️' },
        { id: 'layouts',     label: '03 · Layouts',     icon: '🖼️' },
        { id: 'patterns',    label: '04 · Patterns',    icon: '🧩' },
    ];

    const content = {
        foundations: <FoundationsSection />,
        components:  <ComponentsSection progressValue={progressValue} setProgressValue={setProgressValue} />,
        layouts:     <LayoutsSection />,
        patterns:    <PatternsSection />,
    };

    return (
        <PageLayout className="animate-fade-in">
            <PageHeader
                title="Design System"
                subtitle="NinetyXI · UI component library, token reference and layout patterns."
                badge={{ label: 'DS v3', variant: 'primary' }}
                extra={
                    <Stack direction="row" gap="var(--spacing-sm)">
                        <Button variant="ghost" size="sm">Tokens ↓</Button>
                        <Button variant="secondary" size="sm">Components ↗</Button>
                    </Stack>
                }
            />

            <Tabs
                items={tabs}
                activeId={activeTab}
                onChange={setActiveTab}
                className="mb-xl"
            />

            <PageContent>
                {content[activeTab]}

                <footer style={{
                    marginTop: 'var(--spacing-3xl)',
                    paddingTop: 'var(--spacing-xl)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                        NinetyXI · Design System V3
                    </span>
                    <span style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-xs)' }}>
                        All values from <code style={{ color: 'var(--color-primary-400)' }}>tokens.css</code>
                    </span>
                </footer>
            </PageContent>
        </PageLayout>
    );
};

export default DesignSystemPage;
