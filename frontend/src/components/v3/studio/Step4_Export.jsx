import React, { useState, useRef } from 'react';
import { useStudio } from './StudioContext';
import BarChartRace from './charts/BarChartRace';
import LineChartRace from './charts/LineChartRace';
import './Step4_Export.css';

const Step4_Export = () => {
    const { chartData, visual, goToStep, filters } = useStudio();

    const [isRecording, setIsRecording] = useState(false);
    const [recordUrl, setRecordUrl] = useState(null);
    const [fileSize, setFileSize] = useState(0);
    const [animationKey, setAnimationKey] = useState(0); // For resetting animation

    const canvasRef = useRef(null);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Determine dimensions (HD Resolution)
    const getDimensions = () => {
        switch (visual.format) {
            case '9:16': return { width: 1080, height: 1920 };
            case '1:1': return { width: 1080, height: 1080 };
            case '16:9': return { width: 1920, height: 1080 };
            default: return { width: 1080, height: 1920 };
        }
    };
    const { width, height } = getDimensions();

    // Construct Dynamic Title (Mirrored from Step3)
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

    const startRecording = async () => {
        setRecordUrl(null);
        chunksRef.current = [];

        // 1. Reset Animation by changing key (remounts BarChartRace)
        setAnimationKey(prev => prev + 1);

        // 2. Wait 500ms for resources and layout stability
        await new Promise(r => setTimeout(r, 500));

        // 3. Setup MediaRecorder
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("Canvas ref not found");
            return;
        }

        const stream = canvas.captureStream(60); // 60 FPS for smooth video
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 8000000 // 8 Mbps for high quality
        });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setRecordUrl(url);
            setFileSize((blob.size / 1024 / 1024).toFixed(2));
            setIsRecording(false);
        };

        recorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
    };

    const handleAnimationComplete = () => {
        if (isRecording && recorderRef.current && recorderRef.current.state === 'recording') {
            // Buffer to catch the final stationary frame
            setTimeout(() => {
                if (recorderRef.current && recorderRef.current.state === 'recording') {
                    recorderRef.current.stop();
                }
            }, 1000);
        }
    };

    const generateFilename = () => {
        const stat = filters.stat || 'stats';
        const range = chartData.meta?.range || '2010-2024';
        return `bar_race_${stat}_${range}.webm`;
    };

    return (
        <div className="step-container export-container">
            <header className="export-header">
                <h2>Export Manager</h2>
                <p>Record your animation and download high-quality video for social media.</p>
            </header>

            <div className="export-main">
                <div className="recording-preview-box">
                    <div className="canvas-wrapper" style={{
                        aspectRatio: width / height,
                        maxWidth: height > width ? '300px' : '600px',
                        margin: '0 auto'
                    }}>
                        {(visual.type === 'line' || visual.type === 'bump') ? (
                            <LineChartRace
                                key={animationKey}
                                ref={canvasRef}
                                data={chartData.timeline}
                                width={width}
                                height={height}
                                isPlaying={isRecording}
                                onComplete={() => {
                                    handleAnimationComplete();
                                    setIsRecording(false); // Ensure state update on completion
                                    setIsRecording(false); // Ensure state update on completion
                                }}
                                title={chartTitle}
                                speed={1.0}
                                isBump={visual.type === 'bump'}
                                leagueLogo={chartData.meta.league_logo}
                            />
                        ) : (
                            <BarChartRace
                                key={animationKey}
                                ref={canvasRef}
                                data={chartData.timeline}
                                width={width}
                                height={height}
                                isPlaying={isRecording}
                                onComplete={() => {
                                    handleAnimationComplete();
                                    setIsRecording(false);
                                }}
                                title={chartTitle}
                                speed={1.0}
                            />
                        )}

                        {isRecording && (
                            <div className="rec-overlay">
                                <div className="rec-dot"></div>
                                <span>RECORDING...</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="export-sidebar">
                    <div className="format-info">
                        <div className="info-item">
                            <span className="label">Format</span>
                            <span className="value">{visual.format}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">Resolution</span>
                            <span className="value">{width} x {height}</span>
                        </div>
                    </div>

                    {!recordUrl && !isRecording && (
                        <div className="export-actions">
                            <button className="btn-primary btn-record" onClick={startRecording}>
                                ⏺ Start Rendering
                            </button>
                            <p className="hint">The animation will play once to record. Don't close this tab.</p>
                        </div>
                    )}

                    {isRecording && (
                        <div className="export-status">
                            <div className="spinner"></div>
                            <p>Capturing frames...</p>
                            <button className="btn-secondary" onClick={() => {
                                recorderRef.current?.stop();
                                setIsRecording(false);
                            }}>Cancel</button>
                        </div>
                    )}

                    {recordUrl && (
                        <div className="result-card">
                            <div className="success-badge">✅ Recording Complete</div>
                            <div className="file-details">
                                <span>{fileSize} MB</span>
                                <span className="dot"></span>
                                <span>WEBM</span>
                            </div>

                            <a
                                href={recordUrl}
                                download={generateFilename()}
                                className="btn-primary btn-download"
                            >
                                💾 Download Video
                            </a>

                            <button className="btn-text" onClick={() => setRecordUrl(null)}>
                                🔄 Re-record
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="step-actions">
                <button className="btn-back" onClick={() => goToStep(3)} disabled={isRecording}>
                    ← Back to Preview
                </button>
            </div>
        </div>
    );
};

export default Step4_Export;
