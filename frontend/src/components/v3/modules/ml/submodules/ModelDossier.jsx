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
        <Stack gap="lg">
            <Card title="Model Dossier" subtitle="Detailed breakdown of the intelligence models currently active in the core engine.">
                <Grid columns="repeat(1, 1fr)" gap="md">
                    {models.map(m => (
                        <div key={m.id} className="ds-p-lg ds-bg-neutral-900 ds-rounded-lg ds-border ds-border-neutral-800">
                            <div className="ds-flex ds-justify-between ds-items-start mb-sm">
                                <div>
                                    <h3 className="ds-text-lg ds-font-bold ds-text-primary-400">{m.name}</h3>
                                    <p className="ds-text-sm ds-text-neutral-400 mt-xs">{m.description}</p>
                                </div>
                                <Badge variant="primary">{m.accuracy}</Badge>
                            </div>
                            
                            <div className="mt-md">
                                <span className="ds-text-xs ds-text-neutral-500 ds-uppercase ds-font-bold ds-tracking-wider">Key Feature Sets</span>
                                <div className="ds-flex ds-flex-wrap ds-gap-xs mt-xs">
                                    {m.features.map(f => (
                                        <Badge key={f} variant="surface" size="sm">{f}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </Grid>
            </Card>
        </Stack>
    );
};

export default ModelDossier;
