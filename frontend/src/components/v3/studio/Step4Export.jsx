import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from './StudioContext';
import ChartCanvas from './ChartCanvas';

const Step4Export = () => {
    const { wizardData } = useStudio();
    const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, recording, processing, finished
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [currentYear, setCurrentYear] = useState(wizardData.yearStart);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Config
    const width = wizardData.format === '16:9' ? 1920 : (wizardData.format === '9:16' ? 1080 : 1080);
    const height = wizardData.format === '16:9' ? 1080 : (wizardData.format === '9:16' ? 1920 : 1080);
    const duration = 1000 / wizardData.speed;

    // Logic to drive the animation during recording
    useEffect(() => {
        if (recordingStatus === 'recording') {
            const interval = setInterval(() => {
                setCurrentYear(prev => {
                    const next = prev + 1;
                    if (next > wizardData.yearEnd) {
                        // Stop recording
                        stopRecording();
                        return prev;
                    }
                    return next;
                });
            }, duration);
            return () => clearInterval(interval);
        }
    }, [recordingStatus, wizardData.yearEnd, duration]);

    const startRecording = async () => {
        setRecordingStatus('recording');
        setCurrentYear(wizardData.yearStart);
        chunksRef.current = [];

        // Buffer time handled by just starting the recorder on first frame draw if needed, 
        // but here we just start immediately.
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setRecordingStatus('processing');
        }
    };

    const handleCanvasReady = (canvas) => {
        // Initialize MediaRecorder only once when we start recording
        if (recordingStatus === 'recording' && !mediaRecorderRef.current) {
            const stream = canvas.captureStream(30); // 30 FPS
            const options = { mimeType: 'video/webm;codecs=vp9' };

            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn(`${options.mimeType} is not supported, trying default.`);
                delete options.mimeType;
            }

            const recorder = new MediaRecorder(stream, options);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setDownloadUrl(url);
                setRecordingStatus('finished');
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
        }
    };

    // Reset recorder ref if we stop recording
    useEffect(() => {
        if (recordingStatus !== 'recording') {
            mediaRecorderRef.current = null;
        }
    }, [recordingStatus]);

    return (
        <div className="step-container" style={{ textAlign: 'center' }}>
            <h2>Export Video</h2>

            <div className="export-status">
                {recordingStatus === 'idle' && (
                    <button className="btn-wizard btn-next" onClick={startRecording}>
                        Start Recording
                    </button>
                )}

                {recordingStatus === 'recording' && (
                    <div style={{ color: '#00ff88' }}>
                        Recording Year: {currentYear} ...
                    </div>
                )}

                {recordingStatus === 'processing' && (
                    <div>Processing video...</div>
                )}

                {recordingStatus === 'finished' && downloadUrl && (
                    <div className="download-ready">
                        <h3>Recording Complete!</h3>
                        <video controls src={downloadUrl} style={{ maxWidth: '400px', margin: '1rem 0' }} />
                        <br />
                        <a
                            href={downloadUrl}
                            download={`chart_race_${wizardData.yearStart}-${wizardData.yearEnd}.webm`}
                            className="btn-wizard btn-next"
                        >
                            Download Video
                        </a>
                        <br /><br />
                        <button className="btn-wizard" onClick={() => setRecordingStatus('idle')}>
                            Record Again
                        </button>
                    </div>
                )}
            </div>

            {/* Hidden canvas for recording (or visible if we want user to see progress) */}
            <div style={{
                visibility: recordingStatus === 'recording' ? 'visible' : 'hidden',
                position: recordingStatus === 'recording' ? 'relative' : 'absolute',
                top: recordingStatus === 'recording' ? 0 : -9999,
                margin: '2rem auto',
                border: '2px solid #00ff88',
                width: 'fit-content'
            }}>
                <ChartCanvas
                    wizardData={wizardData}
                    year={currentYear}
                    width={width}
                    height={height}
                    onDrawComplete={handleCanvasReady}
                />
            </div>
        </div>
    );
};

export default Step4Export;
