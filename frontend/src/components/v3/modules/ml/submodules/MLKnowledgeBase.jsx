import React from 'react';
import { Card, Stack, Grid, Badge } from '../../../../../design-system';

const Term = ({ title, description, children }) => (
    <Stack gap="xs" className="ds-animate-reveal">
        <span className="ds-text-sm ds-font-bold ds-text-main">{title}</span>
        <p className="ds-text-sm ds-text-dim ds-leading-relaxed">
            {description}
        </p>
        {children}
    </Stack>
);

const MLKnowledgeBase = () => {
    return (
        <Stack gap="xl" className="ds-animate-reveal">
            <Card title="Neural Glossary" subtitle="Fundamental concepts of our predictive engine.">
                <Grid columns="repeat(auto-fit, minmax(300px, 1fr))" gap="xl">
                    <Term 
                        title="Brier Score (Calibration)" 
                        description="A proper scoring rule that measures the accuracy of probabilistic predictions. It ranges from 0 to 1, where 0 represents a perfect model. It penalizes 'overconfidence' in wrong predictions."
                    >
                        <Badge variant="surface" size="sm">Lower is Better</Badge>
                    </Term>

                    <Term 
                        title="Log Loss" 
                        description="Measures the performance of a classification model where the prediction input is a probability value between 0 and 1. Goal is to minimize the uncertainty of correct labels."
                    />

                    <Term 
                        title="Fair Odds" 
                        description="The mathematical reciprocal of the ML probability (1/p). It represents the 'true' price of an outcome before the bookmaker margin is applied."
                    >
                        <span className="ds-font-mono ds-text-xs ds-text-primary-400">Example: 50% = 2.00 Fair Odd</span>
                    </Term>

                    <Term 
                        title="Expected Value (EV)" 
                        description="The difference between our calculated Fair Odds and the Bookmaker Odds. If Bookmaker > Fair, the bet has positive EV (+EV)."
                    />
                </Grid>
            </Card>

            <Grid columns="2fr 1fr" gap="xl">
                <Card title="Model Ensemble Architecture" subtitle="How our tactical intelligence is synthesized.">
                    <Stack gap="lg">
                        <Term 
                            title="Primary Ensemble (Master)" 
                            description="The core model that aggregates signals from all specialized submodels. It uses a weighted consensus mechanism to produce final probabilities."
                        />
                        
                        <Stack gap="md" className="ds-bg-black/20 ds-p-md ds-rounded-lg ds-border ds-border-white/5">
                            <span className="ds-text-xs ds-font-bold ds-uppercase ds-tracking-widest ds-text-dim">Specialized Sub-Processors</span>
                            <Grid columns="1fr 1fr" gap="sm">
                                <Badge variant="primary" className="ds-justify-start">1X2 (Full Time)</Badge>
                                <Badge variant="primary" className="ds-justify-start">HT Result (Half Time)</Badge>
                                <Badge variant="surface" className="ds-justify-start">Corner Flow Analyzer</Badge>
                                <Badge variant="surface" className="ds-justify-start">Card Discipline Model</Badge>
                                <Badge variant="neutral" className="ds-justify-start">xG Divergence Tracker</Badge>
                                <Badge variant="neutral" className="ds-justify-start">Poisson Goal Intensity</Badge>
                            </Grid>
                        </Stack>
                    </Stack>
                </Card>

                <Card title="The Forge Process" subtitle="Life cycle of a neural weight.">
                    <Stack gap="md" className="ds-font-mono ds-text-xs">
                        <div className="ds-flex ds-gap-sm ds-items-center">
                            <Badge variant="neutral" size="sm">01</Badge>
                            <span className="ds-text-dim">Ingestion & Normalization</span>
                        </div>
                        <div className="ds-flex ds-gap-sm ds-items-center">
                            <Badge variant="neutral" size="sm">02</Badge>
                            <span className="ds-text-dim">Feature Synthesis (Tactical)</span>
                        </div>
                        <div className="ds-flex ds-gap-sm ds-items-center">
                            <Badge variant="primary" size="sm">03</Badge>
                            <span className="ds-text-main">Neural Assembly (Forge)</span>
                        </div>
                        <div className="ds-flex ds-gap-sm ds-items-center">
                            <Badge variant="success" size="sm">04</Badge>
                            <span className="ds-text-main">Backtest Validation</span>
                        </div>
                        <div className="ds-flex ds-gap-sm ds-items-center">
                            <Badge variant="surface" size="sm">05</Badge>
                            <span className="ds-text-dim">Deployment to Hub</span>
                        </div>
                    </Stack>
                </Card>
            </Grid>
        </Stack>
    );
};

export default MLKnowledgeBase;
