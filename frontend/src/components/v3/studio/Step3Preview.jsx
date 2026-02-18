import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from './StudioContext';
import ChartCanvas from './ChartCanvas';

const Step3Preview = () => {
    const { wizardData } = useStudio();
    const [year, setYear] = useState(wizardData.yearStart);
    const [isPlaying, setIsPlaying] = useState(false);

    // Config
    const width = wizardData.format === '16:9' ? 1920 : (wizardData.format === '9:16' ? 1080 : 1080);
    const height = wizardData.format === '16:9' ? 1080 : (wizardData.format === '9:16' ? 1920 : 1080);
    const duration = 1000 / wizardData.speed;

    useEffect(() => {
        let interval;
        if (isPlaying) {
            interval = setInterval(() => {
                setYear(prev => {
                    const next = prev + 1; // Step by 1 year
                    if (next > wizardData.yearEnd) {
                        setIsPlaying(false);
                        return wizardData.yearStart;
                    }
                    return next;
                });
            }, duration);
        }
        return () => clearInterval(interval);
    }, [isPlaying, wizardData.yearEnd, wizardData.yearStart, duration]);

    return (
        <div className="step-container" style={{ display: 'flex', gap: '2rem', height: '100%' }}>
            <div style={{ flex: 1, color: '#fff' }}>
                <h2>Preview</h2>
                <div className="playback-controls">
                    <button className="btn-wizard" onClick={() => setIsPlaying(!isPlaying)}>
                        {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button className="btn-wizard" onClick={() => { setIsPlaying(false); setYear(wizardData.yearStart); }}>
                        Restart
                    </button>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <input
                        type="range"
                        min={wizardData.yearStart}
                        max={wizardData.yearEnd}
                        value={year}
                        onChange={(e) => { setIsPlaying(false); setYear(parseInt(e.target.value)); }}
                        style={{ width: '100%' }}
                    />
                    <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>{year}</div>
                </div>
            </div>

            <div className="preview-panel" style={{ flex: 2, background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <ChartCanvas
                    wizardData={wizardData}
                    year={year}
                    width={width}
                    height={height}
                />
            </div>
        </div>
    );
};

export default Step3Preview;
