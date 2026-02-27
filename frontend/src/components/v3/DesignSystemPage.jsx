import React, { useState } from 'react';
import {
    Card, Button, Badge, Table, Grid, Stack,
    Tabs, Progress, MetricCard, ProfileHeader
} from '../../design-system';

const DesignSystemPage = () => {
    const [activeTab, setActiveTab] = useState('foundations');
    const [progressValue, setProgressValue] = useState(65);

    const colorTokens = [
        { name: '--color-primary-600', value: '#7c3aed', desc: 'Main brand color, call to actions' },
        { name: '--color-accent-500', value: '#f59e0b', desc: 'Highlights, featured stats' },
        { name: '--color-success-500', value: '#10b981', desc: 'Positive trends, active status' },
        { name: '--color-danger-500', value: '#f43f5e', desc: 'Negative trends, errors' },
        { name: '--color-bg-main', value: '#0f172a', desc: 'Base page background' },
        { name: '--color-bg-card', value: 'rgba(30, 41, 59, 0.7)', desc: 'Surface for content grouping' },
    ];

    const spacingTokens = [
        { name: '--spacing-3xs', value: '4px', desc: 'Micro adjustments' },
        { name: '--spacing-2xs', value: '8px', desc: 'Inner component padding' },
        { name: '--spacing-xs', value: '12px', desc: 'The 1u modular unit' },
        { name: '--spacing-sm', value: '18px', desc: 'Component transitions' },
        { name: '--spacing-md', value: '24px', desc: 'Page-level grouping' },
        { name: '--spacing-lg', value: '36px', desc: 'Section spacing' },
        { name: '--spacing-xl', value: '48px', desc: 'Large container padding' },
    ];

    const Sections = {
        foundations: (
            <Stack gap="var(--spacing-xl)">
                <section>
                    <h3 className="mb-md">Color Palette</h3>
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

                <section>
                    <h3 className="mb-md">Spacing System (12px Scale)</h3>
                    <Card>
                        <Table
                            columns={[
                                { title: 'Token', dataIndex: 'name', key: 'name' },
                                { title: 'Value', dataIndex: 'value', key: 'value' },
                                {
                                    title: 'Visual',
                                    key: 'visual',
                                    render: (_, r) => <div style={{ height: '12px', background: 'var(--color-primary-500)', width: r.value, borderRadius: 'var(--radius-xs)' }} />
                                }
                            ]}
                            data={spacingTokens}
                        />
                    </Card>
                </section>
            </Stack>
        ),
        components: (
            <Stack gap="var(--spacing-xl)">
                <section>
                    <h3 className="mb-md">Buttons & Badges</h3>
                    <Card>
                        <Stack gap="var(--spacing-lg)">
                            <Stack gap="var(--spacing-xs)">
                                <label style={{ fontSize: '10px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>Variants</label>
                                <Stack direction="row" gap="var(--spacing-sm)">
                                    <Button variant="primary">Primary Action</Button>
                                    <Button variant="secondary">Secondary</Button>
                                    <Button variant="ghost">Ghost Button</Button>
                                    <Button variant="danger">Danger</Button>
                                </Stack>
                            </Stack>
                            <Stack gap="var(--spacing-xs)">
                                <label style={{ fontSize: '10px', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>States</label>
                                <Stack direction="row" gap="var(--spacing-sm)">
                                    <Button loading>Processing</Button>
                                    <Button disabled>Disabled State</Button>
                                    <Badge variant="success">Active Signal</Badge>
                                    <Badge variant="warning">Warning Notice</Badge>
                                </Stack>
                            </Stack>
                        </Stack>
                    </Card>
                </section>

                <section>
                    <h3 className="mb-md">Navigation & Feedback</h3>
                    <Grid columns="1fr 1fr" gap="var(--spacing-lg)">
                        <Card title="Tabs Navigation">
                            <Tabs
                                items={[
                                    { id: '1', label: 'Dashboard', icon: '📊' },
                                    { id: '2', label: 'Analytics', icon: '📈' },
                                    { id: '3', label: 'Settings', icon: '⚙️' },
                                ]}
                                activeId="1"
                                onChange={() => { }}
                            />
                            <div style={{ marginTop: '24px' }}>
                                <Tabs
                                    variant="pills"
                                    items={[
                                        { id: 'all', label: 'All Results' },
                                        { id: 'win', label: 'Wins' },
                                        { id: 'draw', label: 'Draws' },
                                    ]}
                                    activeId="all"
                                    onChange={() => { }}
                                />
                            </div>
                        </Card>
                        <Card title="Progress Indicators">
                            <Stack gap="var(--spacing-md)">
                                <Progress label="Model Accuracy" value={progressValue} showLabel />
                                <Progress label="Sync Progress" value={40} variant="success" size="sm" />
                                <Progress value={90} variant="danger" size="lg" />
                                <Button size="xs" onClick={() => setProgressValue(v => (v + 10) % 100)}>Update Simulation</Button>
                            </Stack>
                        </Card>
                    </Grid>
                </section>

                <section>
                    <h3 className="mb-md">Metric & Visualization</h3>
                    <Grid columns="repeat(4, 1fr)" gap="var(--spacing-md)">
                        <MetricCard label="Total Vol" value="12.4M" trend={12} icon="💰" />
                        <MetricCard label="Active Users" value="84.2K" trend={-4} icon="👥" />
                        <MetricCard label="Server Load" value="24%" variant="featured" icon="⚡" />
                        <MetricCard label="Processing" value="..." loading />
                    </Grid>
                </section>
            </Stack>
        ),
        layouts: (
            <Stack gap="var(--spacing-xl)">
                <section>
                    <h3 className="mb-md">Hero Profile Patterns</h3>
                    <ProfileHeader
                        title="Lille OSC"
                        subtitles={['Ligue 1', 'France', 'Founded 1944']}
                        image="https://media.api-sports.io/football/teams/79.png"
                        accentColor="#E01E2E"
                        badges={[{ label: 'Elite Tier', variant: 'primary', icon: '⭐️' }]}
                        stats={[
                            { label: 'Rank', value: '#4' },
                            { label: 'Goals', value: '38' },
                            { label: 'Clean Sheets', value: '14' }
                        ]}
                        actions={<Button>Edit Profile</Button>}
                    />
                </section>

                <section>
                    <h3 className="mb-md">Complex Data Grid</h3>
                    <Card>
                        <Table
                            columns={[
                                { title: 'Competition', key: 'comp', render: () => <strong>Ligue 1</strong> },
                                { title: 'Performance', key: 'perf', render: () => <Progress value={75} size="sm" /> },
                                { title: 'Trend', key: 'trend', render: () => <Badge variant="success">Upward</Badge> },
                                { title: 'Rating', key: 'rat', render: () => <Badge variant="primary">7.8</Badge> },
                            ]}
                            data={[{}, {}, {}]}
                        />
                    </Card>
                </section>
            </Stack>
        )
    };

    return (
        <div style={{ padding: 'var(--spacing-xl)', maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
            <header style={{ marginBottom: 'var(--spacing-2xl)' }}>
                <Badge variant="primary" style={{ marginBottom: 'var(--spacing-xs)' }}>DS v3.2 PRO</Badge>
                <h1 style={{ fontSize: 'var(--font-size-5xl)', letterSpacing: '-0.04em' }}>StatFoot Design Language</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-lg)', marginTop: 'var(--spacing-xs)' }}>
                    Next-generation component library for data-heavy football analytics.
                </p>
            </header>

            <Tabs
                items={[
                    { id: 'foundations', label: '01. Foundations', icon: '💎' },
                    { id: 'components', label: '02. Component Lab', icon: '⚙️' },
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
                <p style={{ color: 'var(--color-text-dim)', fontSize: 'var(--font-size-xs)' }}>
                    &copy; 2026 STATFOOT DESIGN SYSTEM • BUILT WITH MODULAR PRINCIPLES
                </p>
            </footer>
        </div>
    );
};

export default DesignSystemPage;
