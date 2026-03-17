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
    const [animationKey, setAnimationKey] = useState(0);


    const canvasRef = useRef(null);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);


    const getDimensions = (format) => {
        switch (format) {
            case '9:16': return { width: 1080, height: 1920 };
            case '1:1': return { width: 1080, height: 1080 };
            case '16:9': return { width: 1920, height: 1080 };
            default: return { width: 1080, height: 1920 };
        }
    };

    const formatStat = (key) => {
        if (!key) return 'Data';
        return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const getChartTitle = (season) => {
        const statName = formatStat(filters.stat);
        const leagueName = chartData?.meta?.league_name || filters.contextLabel || "League";
        const resolvedSeason = chartData?.meta?.season || season;

        if (chartData?.meta?.type === 'league_rankings' || chartData?.meta?.type === 'player_stat_standing') {
            return `${leagueName}: Ranking Pulse (${resolvedSeason}/${Number(resolvedSeason) + 1})`;
        }
        return `Top ${statName} in ${leagueName} (${resolvedSeason})`;
    };


    // --- Manual Single Export Logic ---
    const { width, height } = getDimensions(visual.format);
    const range = filters.years[0] === filters.years[1] ? filters.years[0] : `${filters.years[0]} - ${filters.years[1]}`;
    const chartTitle = getChartTitle(range);

    const startRecording = async () => {
        setRecordUrl(null);
        chunksRef.current = [];
        setAnimationKey(prev => prev + 1);
        await new Promise(r => setTimeout(r, 500));

        const canvas = canvasRef.current;
        if (!canvas) return;

        const stream = canvas.captureStream(60);
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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
        if (isRecording && recorderRef.current?.state === 'recording') {
            setTimeout(() => {
                if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
            }, 1000);
        }
    };
    // Render Standard Export
    return (
        <div className="step-container animate-fade-in">
            <h2 className="step-title-v2">Export & Distribution</h2>
            <div className="export-layout-v2">
                <div className="render-stage-v2">
                    {isRecording && (
                        <div className="rec-overlay-v2">
                            <div className="rec-dot-v2"></div>
                            <span>ASSET CAPTURE IN PROGRESS</span>
                        </div>
                    )}
                    <div className="canvas-wrapper-v2" style={{
                        width: '100%',
                        maxWidth: height > width ? '300px' : '640px',
                        aspectRatio: width / height
                    }}>
                        {(visual.type === 'line' || visual.type === 'bump') ? (
                            <LineChartRace
                                key={animationKey}
                                ref={canvasRef}
                                data={chartData.timeline}
                                width={width}
                                height={height}
                                isPlaying={isRecording}
                                onComplete={handleAnimationComplete}
                                title={chartTitle}
                                speed={1.0}
                                isBump={visual.type === 'bump'}
                                leagueLogo={chartData?.meta?.league_logo}
                                barCount={chartData?.meta?.type === 'league_rankings' ? 20 : 10}
                            />
                        ) : (
                            <BarChartRace
                                key={animationKey}
                                ref={canvasRef}
                                data={chartData.timeline}
                                width={width}
                                height={height}
                                isPlaying={isRecording}
                                onComplete={handleAnimationComplete}
                                title={chartTitle}
                                speed={1.0}
                            />
                        )}
                    </div>
                </div>

                <div className="export-sidebar-v2">
                    <div className="asset-card-v2">
                        <span className="sidebar-title-v2">Output Specifications</span>
                        <div className="spec-list-v2">
                            <div className="spec-item-v2"><span className="spec-label-v2">Architecture</span><span className="spec-value-v2">{visual.type.toUpperCase()}</span></div>
                            <div className="spec-item-v2"><span className="spec-label-v2">Dimensions</span><span className="spec-value-v2">{width}x{height}</span></div>
                            <div className="spec-item-v2"><span className="spec-label-v2">Framerate</span><span className="spec-value-v2">60 FPS</span></div>
                            <div className="spec-item-v2"><span className="spec-label-v2">Bitrate</span><span className="spec-value-v2">8.0 MBPS</span></div>
                        </div>

                        {!recordUrl && !isRecording && (
                            <button className="btn-primary-v2" onClick={startRecording}>Export for Social Media</button>
                        )}

                        {isRecording && (
                            <div className="status-box-v2">
                                <p className="status-text-v2">Processing Frames...</p>
                                <button className="btn-secondary-v2" style={{ width: '100%', padding: '0.8rem' }} onClick={() => recorderRef.current?.stop()}>Force Stop</button>
                            </div>
                        )}

                        {recordUrl && (
                            <div className="result-zone-v2">
                                <div className="status-box-v2" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                                    <p className="status-text-v2" style={{ color: '#10b981' }}>Capture Finalized ({fileSize}MB)</p>
                                </div>
                                <a href={recordUrl} download={`studio_${filters.stat}_${range}.webm`} className="btn-download-v2">💾 Download Asset</a>
                                <button className="re-record-btn-v2" onClick={() => setRecordUrl(null)}>Reset Production Pipeline</button>
                            </div>
                        )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5, padding: '0 1rem' }}>
                        Note: Asset dimensions are optimized for TikTok, Instagram Reels, and X (Twitter) safe zones.
                    </p>
                </div>
            </div>

            <div className="nav-actions-v2">
                <button className="btn-secondary-v2" onClick={() => goToStep(3)} disabled={isRecording}>
                    ← Return to Preview
                </button>
            </div>
        </div>
    );
};

export default Step4_Export;
