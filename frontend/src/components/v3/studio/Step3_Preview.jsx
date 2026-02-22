import React, { useState } from 'react';
import { useStudio } from './StudioContext';
import './Step3_Preview.css';
import BarChartRace from './charts/BarChartRace';
import LineChartRace from './charts/LineChartRace';

const Step3_Preview = () => {
    const {
        chartData, visual, filters,
        goToStep, prevStep
    } = useStudio();

    const [isPlaying, setIsPlaying] = useState(false);

    if (!chartData || !chartData.timeline || chartData.timeline.length === 0) {
        return <div className="error-state">No surveillance data available to render.</div>;
    }

    const togglePlay = () => setIsPlaying(!isPlaying);
    const restart = () => {
        setIsPlaying(false);
        setTimeout(() => setIsPlaying(true), 100);
    };

    // Determine configuration based on format - HD Canvas Resolution
    const getLayoutConfig = () => {
        const isBumpOrRankings = (visual.type === 'bump' || (chartData.meta && chartData.meta.type === 'league_rankings'));
        const defaultBarCount = isBumpOrRankings ? 25 : 15;

        switch (visual.format) {
            case '9:16': return { width: 1080, height: 1920, barCount: isBumpOrRankings ? 25 : 15 };
            case '1:1': return { width: 1080, height: 1080, barCount: isBumpOrRankings ? 25 : 15 };
            case '16:9': return { width: 1920, height: 1080, barCount: isBumpOrRankings ? 25 : 15 };
            default: return { width: 1920, height: 1080, barCount: defaultBarCount };
        }
    };

    const layout = getLayoutConfig();

    // Construct Dynamic Title
    const formatStat = (key) => {
        if (!key) return 'Data';
        return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const statName = formatStat(filters.stat);
    const range = `${filters.years[0]}-${filters.years[1]}`;

    let chartTitle = `Top ${statName} during ${range}`;
    if (chartData.meta.type === 'league_rankings') {
        const seasonYear = chartData.meta.season;
        const seasonDisplay = `${seasonYear - 1}/${seasonYear}`;
        const leagueName = chartData.meta.league_name || filters.contextLabel || "League";
        chartTitle = `${leagueName} (${seasonDisplay})`;
    } else if (filters.contextType === 'league' && filters.contextLabel) {
        chartTitle = `Top ${statName} in ${filters.contextLabel} during ${range}`;
    } else if (filters.contextType === 'country' && filters.contextLabel) {
        chartTitle = `Top ${statName} for ${filters.contextLabel} during ${range}`;
    }

    return (
        <div className="step-container animate-fade-in" style={{ maxWidth: '1000px' }}>
            <h2 className="step-title-v2">Visualization Engine Preview</h2>

            <div className="preview-stage-v2">
                {/* HD Canvas Wrapper */}
                <div className="canvas-wrapper-v2" style={{
                    width: '100%',
                    maxWidth: visual.format === '9:16' ? '400px' : '800px',
                    aspectRatio: visual.format === '9:16' ? '9/16' : (visual.format === '1:1' ? '1/1' : '16/9')
                }}>
                    {visual.type === 'line' || visual.type === 'bump' ? (
                        <LineChartRace
                            data={chartData.timeline}
                            width={layout.width}
                            height={layout.height}
                            barCount={layout.barCount}
                            isPlaying={isPlaying}
                            speed={visual.speed}
                            onComplete={() => setIsPlaying(false)}
                            title={chartTitle}
                            isBump={visual.type === 'bump'}
                            leagueLogo={chartData.meta.league_logo}
                        />
                    ) : (
                        <BarChartRace
                            data={chartData.timeline}
                            width={layout.width}
                            height={layout.height}
                            barCount={layout.barCount}
                            isPlaying={isPlaying}
                            speed={visual.speed}
                            onComplete={() => setIsPlaying(false)}
                            title={chartTitle}
                        />
                    )}
                </div>

                {/* Playback Control Deck */}
                <div className="playback-console-v2">
                    <button className="ctrl-btn-v2" onClick={restart} title="Rewind to start">
                        ⏮
                    </button>
                    <button className={`ctrl-btn-v2 play`} onClick={togglePlay}>
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                    <div className="playback-info-v2">
                        <span className="info-label-v2">Stream Status</span>
                        <span className="info-value-v2">{isPlaying ? 'LIVE RENDERING' : 'READY TO PLAY'}</span>
                    </div>
                    <div className="playback-info-v2">
                        <span className="info-label-v2">Intelligence Scope</span>
                        <span className="info-value-v2">{statName} • {visual.speed}x</span>
                    </div>
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="nav-actions-v2">
                <button className="btn-secondary-v2" onClick={prevStep}>← Adjust Config</button>
                <button className="btn-primary-v2" style={{ flex: 1 }} onClick={() => goToStep(4)}>
                    Export Master Asset →
                </button>
            </div>
        </div>
    );
};

export default Step3_Preview;
