import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from './StudioContext';
import BarChartRace from './charts/BarChartRace';
import './Step4_Export.css';

const Step4_Export = () => {
    const { chartData, visual, goToStep, filters } = useStudio();

    const [isRecording, setIsRecording] = useState(false);
    const [progress, setProgress] = useState(0);
    const [recordUrl, setRecordUrl] = useState(null);
    const [fileSize, setFileSize] = useState(0);

    // Automation Ref
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Determine dimensions
    const getDimensions = () => {
        // High Quality dimensions
        switch (visual.format) {
            case '9:16': return { width: 1080, height: 1920 };
            case '1:1': return { width: 1080, height: 1080 };
            case '16:9': return { width: 1920, height: 1080 };
            default: return { width: 1080, height: 1920 };
        }
    };
    const { width, height } = getDimensions();

    const startRecording = () => {
        setRecordUrl(null);
        chunksRef.current = [];
        setProgress(0);

        // 1. Get Canvas Stream
        const canvas = document.querySelector('.export-canvas');
        if (!canvas) {
            console.error("Canvas not found");
            return;
        }

        const stream = canvas.captureStream(30); // 30 FPS

        // 2. Init Recorder
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm'; // Fallback
        }

        const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 5000000 // 5 Mbps
        });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setRecordUrl(url);
            setFileSize((blob.size / 1024 / 1024).toFixed(2)); // MB
            setIsRecording(false);
        };

        recorderRef.current = recorder;
        recorder.start();

        // 3. Start Animation
        // We set isRecording=true, which corresponds to isPlaying=true in the chart
        setIsRecording(true);
    };

    const handleAnimationComplete = () => {
        if (isRecording && recorderRef.current && recorderRef.current.state === 'recording') {
            // Stop recording
            // Add slight buffer (500ms) to catch the final frame fully
            setTimeout(() => {
                recorderRef.current.stop();
            }, 500);
        }
    };

    // Auto-start recording on mount? Maybe better manual button.
    // Let's use Manual "Start Export" button.

    return (
        <div className="step-container export-container">
            <h2>Export Video</h2>

            {/* Hidden/Visible Canvas for Recording */}
            {/* We scale it down visually via CSS but keep internal res high */}
            <div className="recording-viewport">
                <BarChartRace
                    data={chartData.timeline}
                    width={width}
                    height={height}
                    isPlaying={isRecording}
                    onComplete={handleAnimationComplete}
                    speed={1.0} // Always record at 1.0x for consistency? Or user speed? Let's use user speed.
                    className="export-canvas" // This prop doesn't exist yet on BarChartRace, need to add it or wrap it
                />

                {/* Overlay while recording */}
                {isRecording && (
                    <div className="recording-overlay">
                        <div className="rec-indicator">🔴 Recording...</div>
                        <p>Please wait while your video is rendering.</p>
                    </div>
                )}
            </div>

            {/* Success State */}
            {recordUrl && (
                <div className="success-card">
                    <h3>✅ Video Ready!</h3>
                    <div className="file-info">
                        <span>{fileSize} MB</span> • <span>.webm</span>
                    </div>

                    <div className="download-actions">
                        <a
                            href={recordUrl}
                            download={`statfoot_chart_${filters.stat}_${visual.format}.webm`}
                            className="btn-download"
                        >
                            ⬇ Download Video
                        </a>
                        <button className="btn-secondary" onClick={() => setRecordUrl(null)}>
                            🔄 Create Another
                        </button>
                    </div>

                    <video src={recordUrl} controls className="preview-video" />
                </div>
            )}

            {/* Initial State */}
            {!isRecording && !recordUrl && (
                <div className="init-actions">
                    <p>Format: <strong>{visual.format}</strong> • Resolution: <strong>{width}x{height}</strong></p>
                    <button className="btn-record" onClick={startRecording}>
                        🎬 Start Rendering
                    </button>
                </div>
            )}

            <div className="step-actions">
                <button className="btn-back" onClick={() => goToStep(3)} disabled={isRecording}>
                    ← Back to Preview
                </button>
            </div>
        </div>
    );
};

export default Step4_Export;
