import React from 'react';
import { Card, Button, Badge, Table, Grid, Stack } from '../../design-system';

const DesignSystemPage = () => {
    const tableColumns = [
        { title: 'Token Name', dataIndex: 'name', key: 'name' },
        { title: 'Value', dataIndex: 'value', key: 'value', render: (val) => <code>{val}</code> },
        {
            title: 'Preview', key: 'preview', render: (_, record) => (
                <div style={{
                    width: '32px',
                    height: '24px',
                    backgroundColor: record.value.includes('#') || record.value.includes('rgba') || record.value.includes('var') ? record.value : 'transparent',
                    backgroundImage: record.value.includes('gradient') ? record.value : 'none',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)'
                }}></div>
            )
        }
    ];

    const colorData = [
        { name: '--color-primary-600', value: 'var(--color-primary-600)' },
        { name: '--color-accent-500', value: 'var(--color-accent-500)' },
        { name: '--color-success-500', value: 'var(--color-success-500)' },
        { name: '--color-danger-500', value: 'var(--color-danger-500)' },
        { name: '--color-bg-main', value: 'var(--color-bg-main)' },
        { name: '--color-bg-card', value: 'var(--color-bg-card)' },
    ];

    const spacingData = [
        { name: '--spacing-xs', value: '12px (1u)', preview: '12px' },
        { name: '--spacing-sm', value: '24px (2u)', preview: '24px' },
        { name: '--spacing-md', value: '36px (3u)', preview: '36px' },
        { name: '--spacing-lg', value: '48px (4u)', preview: '48px' },
        { name: '--spacing-xl', value: '72px (6u)', preview: '72px' },
    ];

    const dummyTableData = [
        { id: 1, name: 'Premier League', status: 'Active', team: 'Arsenal', rating: 7.4 },
        { id: 2, name: 'La Liga', status: 'Pending', team: 'Real Madrid', rating: 7.2 },
        { id: 3, name: 'Serie A', status: 'Locked', team: 'Inter', rating: 6.9 },
    ];

    const dummyTableCols = [
        { title: 'Competition', dataIndex: 'name', key: 'name', render: (v) => <strong>{v}</strong> },
        { title: 'Main Team', dataIndex: 'team', key: 'team' },
        {
            title: 'In Sync',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Badge variant={status === 'Active' ? 'success' : status === 'Locked' ? 'danger' : 'warning'}>
                    {status}
                </Badge>
            )
        },
        {
            title: 'Avg Rating',
            dataIndex: 'rating',
            key: 'rating',
            align: 'center',
            render: (r) => <Badge variant={r >= 7.2 ? 'primary' : 'neutral'}>{r.toFixed(1)}</Badge>
        },
        {
            title: 'Action',
            key: 'action',
            render: () => <Button size="xs" variant="ghost">Details</Button>
        }
    ];

    return (
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: '1600px', margin: '0 auto', color: 'var(--color-text-main)' }} className="animate-fade-in">
            <header style={{ marginBottom: 'var(--spacing-xl)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--spacing-md)' }}>
                <Stack direction="row" justify="space-between" align="center">
                    <div>
                        <Badge variant="primary" style={{ marginBottom: 'var(--spacing-xs)' }}>System Core v3.1</Badge>
                        <h1 style={{ fontSize: 'var(--font-size-5xl)', margin: 0, letterSpacing: '-0.04em' }}>StatFoot Design Language</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xl)', marginTop: 'var(--spacing-xs)', maxWidth: '600px' }}>
                            A modular, 12px-based design system optimized for high-density statistical visualization and real-time betting interfaces.
                        </p>
                    </div>
                </Stack>
            </header>

            <Grid columns="280px 1fr" gap="var(--spacing-lg)">
                {/* Navigation Sidebar */}
                <aside style={{ borderRight: '1px solid var(--color-border)', paddingRight: 'var(--spacing-lg)' }}>
                    <Stack gap="var(--spacing-1)">
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-dim)', marginBottom: '8px', letterSpacing: '0.1em' }}>Foundations</label>
                        <Button variant="ghost" className="justify-start">Color Palette</Button>
                        <Button variant="ghost" className="justify-start">Typography</Button>
                        <Button variant="ghost" className="justify-start">Spacing Scale</Button>

                        <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-dim)', margin: '24px 0 8px', letterSpacing: '0.1em' }}>Components</label>
                        <Button variant="ghost" className="justify-start">Buttons & Badges</Button>
                        <Button variant="ghost" className="justify-start">Cards & Surfaces</Button>
                        <Button variant="ghost" className="justify-start">Data Tables</Button>
                        <Button variant="ghost" className="justify-start">Layout (Grid/Stack)</Button>
                    </Stack>
                </aside>

                <Stack gap="var(--spacing-xl)">
                    {/* Foundations */}
                    <section id="tokens">
                        <Stack gap="var(--spacing-lg)">
                            <div>
                                <h2 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--spacing-sm)' }}>01. Foundations</h2>
                                <p style={{ color: 'var(--color-text-muted)' }}>The core building blocks of visual identity.</p>
                            </div>

                            <Grid columns="1fr 1fr" gap="var(--spacing-lg)">
                                <Card title="Primary Colors" subtitle="Identity and interactive elements">
                                    <Table columns={tableColumns} data={colorData} />
                                </Card>
                                <Card title="Spacing (12px Scale)" subtitle="Strict units for alignment">
                                    <Table
                                        columns={[
                                            { title: 'Token', dataIndex: 'name', key: 'name' },
                                            { title: 'Value', dataIndex: 'value', key: 'value' },
                                            {
                                                title: 'Visual',
                                                key: 'v',
                                                render: (_, r) => <div style={{ height: '8px', background: 'var(--color-primary-500)', width: r.preview, borderRadius: '4px' }}></div>
                                            }
                                        ]}
                                        data={spacingData}
                                    />
                                </Card>
                            </Grid>
                        </Stack>
                    </section>

                    {/* Components */}
                    <section id="components">
                        <Stack gap="var(--spacing-lg)">
                            <div>
                                <h2 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--spacing-sm)' }}>02. Interaction Lab</h2>
                                <p style={{ color: 'var(--color-text-muted)' }}>Reusable UI patterns and their states.</p>
                            </div>

                            <Card title="Buttons & Badges">
                                <Stack gap="var(--spacing-lg)">
                                    <Stack gap="var(--spacing-xs)">
                                        <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>Button Variants</p>
                                        <Stack direction="row" gap="var(--spacing-sm)" align="center">
                                            <Button variant="primary">Primary</Button>
                                            <Button variant="secondary">Secondary</Button>
                                            <Button variant="ghost">Ghost</Button>
                                            <Button variant="danger">Danger</Button>
                                        </Stack>
                                    </Stack>

                                    <Grid columns="1fr 1fr" gap="var(--spacing-lg)">
                                        <Stack gap="var(--spacing-xs)">
                                            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>Sizes</p>
                                            <Stack direction="row" gap="var(--spacing-sm)" align="center">
                                                <Button size="xs">XS</Button>
                                                <Button size="sm">Small</Button>
                                                <Button size="md">Medium</Button>
                                                <Button size="lg">Large</Button>
                                            </Stack>
                                        </Stack>
                                        <Stack gap="var(--spacing-xs)">
                                            <p style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-dim)' }}>Badges</p>
                                            <Stack direction="row" gap="var(--spacing-sm)" align="center">
                                                <Badge variant="primary">Primary</Badge>
                                                <Badge variant="success">Success</Badge>
                                                <Badge variant="warning">Warning</Badge>
                                                <Badge variant="danger">Danger</Badge>
                                                <Badge variant="neutral">Neutral</Badge>
                                            </Stack>
                                        </Stack>
                                    </Grid>
                                </Stack>
                            </Card>

                            <Card title="Data Presentation" subtitle="High-density information grids">
                                <Table
                                    columns={dummyTableCols}
                                    data={dummyTableData}
                                    onRowClick={(row) => alert(`Selected ${row.name}`)}
                                />
                            </Card>
                        </Stack>
                    </section>

                    {/* Layout Examples */}
                    <section id="layout">
                        <Stack gap="var(--spacing-lg)">
                            <div>
                                <h2 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--spacing-sm)' }}>03. Structure</h2>
                                <p style={{ color: 'var(--color-text-muted)' }}>Composition principles using Grid and Stack.</p>
                            </div>

                            <Grid columns="repeat(3, 1fr)" gap="var(--spacing-lg)">
                                <Card title="Live Match" subtitle="Composition example">
                                    <Stack align="center" gap="var(--spacing-sm)">
                                        <Stack direction="row" align="center" gap="var(--spacing-lg)">
                                            <img src="https://media.api-sports.io/football/teams/42.png" alt="" style={{ width: '48px' }} />
                                            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold' }}>2 - 0</div>
                                            <img src="https://media.api-sports.io/football/teams/33.png" alt="" style={{ width: '48px' }} />
                                        </Stack>
                                        <Badge variant="success" size="sm">Partie en cours</Badge>
                                    </Stack>
                                </Card>
                                <Card title="Player Profile" subtitle="Card overlay example">
                                    <Stack direction="row" gap="var(--spacing-sm)" align="center">
                                        <div style={{ width: '40px', height: '40px', background: 'var(--color-primary-600)', borderRadius: '50%' }}></div>
                                        <Stack gap="2px">
                                            <div style={{ fontWeight: 'bold' }}>Martin Ødegaard</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>MF • ARSENAL</div>
                                        </Stack>
                                    </Stack>
                                </Card>
                                <Card title="Form Guide" subtitle="Micro-viz example">
                                    <Stack direction="row" gap="4px" justify="center" style={{ marginTop: '12px' }}>
                                        {['W', 'W', 'D', 'W', 'L'].map((f, i) => (
                                            <Badge key={i} variant={f === 'W' ? 'success' : f === 'D' ? 'warning' : 'danger'} size="sm" style={{ width: '24px', height: '24px', padding: 0 }}>{f}</Badge>
                                        ))}
                                    </Stack>
                                </Card>
                            </Grid>
                        </Stack>
                    </section>
                </Stack>
            </Grid>
        </div>
    );
};

export default DesignSystemPage;
