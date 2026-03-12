import React from 'react';
import { Card, Stack, Grid, Badge } from '../../../../../design-system';

const ModelDossier = () => {
    const models = [
        {
            id: '1x2',
            name: 'Outcome Engine (1X2)',
            description: 'Predicts the final result (Home, Draw, Away) using team momentum, historical H2H, and contextual match factors.',
            features: ['Rolling Goals (P3/P5/P10)', 'Venue Performance', 'Momentum Delta', 'League Standing Context'],
            accuracy: '65-72%'
        },
        {
            id: 'corners',
            name: 'Corner Specialization',
            description: 'Predicts Over/Under 9.5 corners based on team offensive width and defensive clearance tendencies.',
            features: ['Corner Momentum For/Against', 'League Corner Average', 'Tactical Width Markers'],
            accuracy: '58-64%'
        },
        {
            id: 'cards',
            name: 'Disciplinary Model',
            description: 'Predicts Over/Under 3.5 total cards. Analyzes team aggression metrics and referee historical data.',
            features: ['Yellow/Red Card Momentum', 'Foul Intensity', 'Derby/Rivalry Weighting'],
            accuracy: '62-68%'
        }
    ];

    return (
        <Stack gap="lg" className="ds-animate-reveal">
            <Card title="Model Dossier" subtitle="Detailed breakdown of the intelligence models currently active in the core engine.">
                <Grid columns="repeat(1, 1fr)" gap="md">
                    {models.map((m, i) => (
                        <Stack 
                            key={m.id} 
                            gap="md"
                            className="ds-p-lg ds-bg-card ds-rounded-lg ds-border ds-border-neutral-800 ds-animate-reveal"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <Stack direction="row" className="ds-justify-between ds-items-start">
                                <Stack gap="xs">
                                    <h3 className="ds-text-lg ds-font-bold ds-text-primary-400">{m.name}</h3>
                                    <p className="ds-text-sm ds-text-dim">{m.description}</p>
                                </Stack>
                                <Badge variant="primary">{m.accuracy}</Badge>
                            </Stack>
                            
                            <Stack gap="sm">
                                <span className="ds-text-xs ds-text-dim ds-uppercase ds-font-bold ds-tracking-wider">Key Feature Sets</span>
                                <Stack direction="row" gap="xs" className="ds-flex-wrap">
                                    {m.features.map(f => (
                                        <Badge key={f} variant="surface" size="sm">{f}</Badge>
                                    ))}
                                </Stack>
                            </Stack>
                        </Stack>
                    ))}
                </Grid>
            </Card>
        </Stack>
    );
};

export default ModelDossier;
