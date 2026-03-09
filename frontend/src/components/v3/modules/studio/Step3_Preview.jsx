import React, { useState } from 'react';
import { useStudio } from './StudioContext';
import './Step3_Preview.css';
import BarChartRace from './charts/BarChartRace';
import LineChartRace from './charts/LineChartRace';

const getLayoutConfig = (visual, chartData) => {
    const isBumpOrRankings = (visual.type === 'bump' || (chartData?.meta?.type === 'league_rankings'));
    const defaultBarCount = isBumpOrRankings ? 25 : 15;
    const configs = { '9:16': { w: 1080, h: 1920 }, '1:1': { w: 1080, h: 1080 }, '16:9': { w: 1920, h: 1080 } };
    const { w, h } = configs[visual.format] || { w: 1920, h: 1080 };
    return { width: w, height: h, barCount: defaultBarCount };
};

const getChartTitle = (chartData, filters) => {
    const statName = filters.stat?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Data';
    const range = filters.years[0] === filters.years[1] ? filters.years[0] : `${filters.years[0]} - ${filters.years[1]}`;
    if (chartData.meta.type === 'league_rankings') return `${chartData.meta.league_name || filters.contextLabel || "League"}: Ranking Pulse (${chartData.meta.season}/${chartData.meta.season + 1})`;
    const titles = { league: `Top ${statName} in ${filters.contextLabel}`, country: `Best ${statName} from ${filters.contextLabel}`, specific: `Comparing ${statName}: ${filters.contextLabel}` };
    return `${titles[filters.contextType] || `Who had the most ${statName}`} (${range})`;
};

const Step3_Preview = () => {
    const { chartData, visual, filters, goToStep, prevStep } = useStudio();
    const [isPlaying, setIsPlaying] = useState(false);

    if (!chartData?.timeline?.length) return <div className="error-state">No surveillance data available.</div>;

    const layout = getLayoutConfig(visual, chartData);
    const chartTitle = getChartTitle(chartData, filters);

    return (
        <div className="step-container animate-fade-in" style={{ maxWidth: '1000px' }}>
            <h2 className="step-title-v2">Creative Preview</h2>
            <div className="preview-stage-v2">
                <div
                    className="canvas-wrapper-v2"
                    style={{
                        width: '100%',
                        maxWidth: visual.format === '9:16' ? '400px' : '800px',
                        aspectRatio: (() => {
                            if (visual.format === '9:16') return '9/16';
                            if (visual.format === '1:1') return '1/1';
                            return '16/9';
                        })()
                    }}
                >
                    {visual.type === 'line' || visual.type === 'bump' ? (
                        <LineChartRace data={chartData.timeline} width={layout.width} height={layout.height} barCount={layout.barCount} isPlaying={isPlaying} speed={visual.speed} onComplete={() => setIsPlaying(false)} title={chartTitle} isBump={visual.type === 'bump'} leagueLogo={chartData.meta.league_logo} />
                    ) : (
                        <BarChartRace data={chartData.timeline} width={layout.width} height={layout.height} barCount={layout.barCount} isPlaying={isPlaying} speed={visual.speed} onComplete={() => setIsPlaying(false)} title={chartTitle} />
                    )}
                </div>
                <div className="playback-console-v2">
                    <button className="ctrl-btn-v2" onClick={() => { setIsPlaying(false); setTimeout(() => setIsPlaying(true), 100); }}>⏮</button>
                    <button className="ctrl-btn-v2 play" onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? '⏸' : '▶'}</button>
                    <div className="playback-info-v2"><span className="info-label-v2">Stream Status</span><span className="info-value-v2">{isPlaying ? 'LIVE RENDERING' : 'READY TO PLAY'}</span></div>
                    <div className="playback-info-v2"><span className="info-label-v2">Metric</span><span className="info-value-v2">{filters.stat?.replace(/_/g, ' ')} • {visual.speed}x</span></div>
                </div>
            </div>
            <div className="nav-actions-v2">
                <button className="btn-secondary-v2" onClick={prevStep}>← Adjust Config</button>
                <button className="btn-primary-v2" style={{ flex: 1 }} onClick={() => goToStep(4)}>Export Master Asset →</button>
            </div>
        </div>
    );
};

export default Step3_Preview;
