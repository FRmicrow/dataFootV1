import React, { useState } from 'react';
import { useStudio } from './StudioContext';
import './Step3_Preview.css';
import BarChartRace from './charts/BarChartRace';

const Step3_Preview = () => {
    const {
        chartData, visual, filters,
        goToStep, prevStep
    } = useStudio();

    const [isPlaying, setIsPlaying] = useState(false);

    // Determine dimensions based on format
    const getDimensions = () => {
        switch (visual.format) {
            case '9:16': return { width: 400, height: 711 }; // Scaled down for preview
            case '1:1': return { width: 500, height: 500 };
            case '16:9': return { width: 711, height: 400 };
            default: return { width: 400, height: 711 };
        }
    };
    const { width, height } = getDimensions();

    const togglePlay = () => setIsPlaying(!isPlaying);
    const restart = () => {
        setIsPlaying(false);
        // Reset logic handled inside chart component via key or ref
        // For MVP, simplistic toggle
        setTimeout(() => setIsPlaying(true), 100);
    };

    if (!chartData || !chartData.timeline || chartData.timeline.length === 0) {
        return <div className="error-state">No data available to render.</div>;
    }

    // Determine configuration based on format - HD Canvas Resolution
    const getLayoutConfig = () => {
        switch (visual.format) {
            case '9:16': return { width: 1080, height: 1920, barCount: 25 }; // HD Vertical
            case '1:1': return { width: 1080, height: 1080, barCount: 20 };   // HD Square
            case '16:9': return { width: 1920, height: 1080, barCount: 15 };  // HD Landscape
            default: return { width: 1920, height: 1080, barCount: 15 };
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
    if (filters.contextType === 'league' && filters.contextLabel) {
        chartTitle = `Top ${statName} in ${filters.contextLabel} during ${range}`;
    } else if (filters.contextType === 'country' && filters.contextLabel) {
        chartTitle = `Top ${statName} for ${filters.contextLabel} during ${range}`;
    }

    return (
        <div className="preview-container fade-in">
            {/* Canvas Wrapper - preview scales down via CSS */}
            <div className="canvas-wrapper" style={{
                width: '100%',
                maxWidth: visual.format === '9:16' ? '500px' : '800px',
                aspectRatio: visual.format === '9:16' ? '9/16' : (visual.format === '1:1' ? '1/1' : '16/9')
            }}>
                <BarChartRace
                    data={chartData.timeline}
                    width={layout.width}
                    height={layout.height}
                    barCount={layout.barCount} // Dynamic Player Count
                    isPlaying={isPlaying}
                    speed={visual.speed}
                    onComplete={() => setIsPlaying(false)}
                    title={chartTitle}
                />
            </div>
            <div className="preview-controls">
                <button className="ctrl-btn" onClick={togglePlay}>
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <button className="ctrl-btn" onClick={restart}>
                    Rewind
                </button>
                <div className="playback-info">
                    {chartData.meta.range} • {visual.speed}x Speed
                </div>
            </div>

            <div className="step-actions">
                <button className="btn-back" onClick={prevStep}>← Configure</button>
                <button className="btn-next" onClick={() => goToStep(4)}>
                    Next: Export Video →
                </button>
            </div>
        </div>
    );
};

export default Step3_Preview;
