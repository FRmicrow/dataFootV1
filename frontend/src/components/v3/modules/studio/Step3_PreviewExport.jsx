import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useStudio } from './StudioContext';
import { Button, Stack } from '../../../../design-system';
import BarChartRace from './charts/BarChartRace';
import LineChartRace from './charts/LineChartRace';
import './Step3_PreviewExport.css';

const FORMAT_OPTIONS = [
    { value: '9:16', label: '9:16', icon: '\u{1F4F1}', w: 1080, h: 1920 },
    { value: '1:1', label: '1:1', icon: '\u{1F4F7}', w: 1080, h: 1080 },
    { value: '16:9', label: '16:9', icon: '\u{1F4BB}', w: 1920, h: 1080 }
];

const getChartTitle = (chartData, filters) => {
    const statName = filters.stat?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Data';
    const range = filters.years[0] === filters.years[1] ? filters.years[0] : `${filters.years[0]} - ${filters.years[1]}`;

    if (chartData?.meta?.type === 'league_rankings') {
        const season = chartData.meta.season || filters.years[1];
        return `${chartData.meta.league_name || filters.contextLabel || 'League'}: Ranking Pulse (${season}/${season + 1})`;
    }

    const titles = {
        league: `Top ${statName} in ${filters.contextLabel}`,
        country: `Best ${statName} from ${filters.contextLabel}`,
        specific: `Comparing ${statName}: ${filters.contextLabel}`
    };
    return `${titles[filters.contextType] || `Who had the most ${statName}`} (${range})`;
};

const Step3_PreviewExport = () => {
    const { chartData, visual, filters, prevStep } = useStudio();

    // Preview state
    const [isPlaying, setIsPlaying] = useState(false);
    const [previewKey, setPreviewKey] = useState(0);

    // Export state
    const [selectedFormats, setSelectedFormats] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('');
    const [exportResults, setExportResults] = useState([]);

    const exportCanvasRef = useRef(null);
    const exportRecorderRef = useRef(null);
    const exportChunksRef = useRef([]);

    // Preview layout — always 16:9 for preview
    const previewLayout = useMemo(() => {
        const isBumpOrRankings = visual.type === 'bump' || chartData?.meta?.type === 'league_rankings';
        return { width: 1920, height: 1080, barCount: isBumpOrRankings ? 25 : 15 };
    }, [visual.type, chartData?.meta?.type]);

    const chartTitle = useMemo(
        () => getChartTitle(chartData, filters),
        [chartData, filters]
    );

    const isLineType = visual.type === 'line' || visual.type === 'bump';

    const chartExtraProps = useMemo(() =>
        isLineType
            ? { isBump: visual.type === 'bump', leagueLogo: chartData?.meta?.league_logo }
            : {},
        [isLineType, visual.type, chartData?.meta?.league_logo]
    );

    const toggleFormat = useCallback((fmt) => {
        setSelectedFormats(prev =>
            prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]
        );
    }, []);

    const handleRestart = useCallback(() => {
        setIsPlaying(false);
        setPreviewKey(k => k + 1);
        setTimeout(() => setIsPlaying(true), 100);
    }, []);

    // --- Export logic: record one format at a time ---
    const exportSingleFormat = useCallback((formatObj) => {
        return new Promise((resolve) => {
            const { w, h } = formatObj;
            const isBump = visual.type === 'bump' || chartData?.meta?.type === 'league_rankings';
            const barCount = isBump ? 20 : 10;

            // We need to render an offscreen chart for this format
            // Use a temporary state to trigger re-render with export dimensions
            exportChunksRef.current = [];

            const checkCanvas = () => {
                const canvas = exportCanvasRef.current;
                if (!canvas) {
                    setTimeout(checkCanvas, 100);
                    return;
                }

                const stream = canvas.captureStream(60);
                let mimeType = 'video/webm;codecs=vp9';
                if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

                const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) exportChunksRef.current.push(e.data);
                };
                recorder.onstop = () => {
                    const blob = new Blob(exportChunksRef.current, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    const size = (blob.size / 1024 / 1024).toFixed(2);
                    resolve({ format: formatObj.value, url, size, width: w, height: h });
                };
                exportRecorderRef.current = recorder;
                recorder.start();
            };

            checkCanvas();
        });
    }, [visual.type, chartData?.meta?.type]);

    const [exportFormat, setExportFormat] = useState(null);
    const [exportAnimKey, setExportAnimKey] = useState(0);

    const handleExportComplete = useCallback(() => {
        if (exportRecorderRef.current?.state === 'recording') {
            setTimeout(() => {
                if (exportRecorderRef.current?.state === 'recording') {
                    exportRecorderRef.current.stop();
                }
            }, 1000);
        }
    }, []);

    const startExport = useCallback(async () => {
        if (selectedFormats.length === 0) return;
        setIsExporting(true);
        setExportResults([]);
        setIsPlaying(false);

        const results = [];
        for (const fmtValue of selectedFormats) {
            const fmt = FORMAT_OPTIONS.find(f => f.value === fmtValue);
            setExportProgress(`Exporting ${fmt.label}...`);
            setExportFormat(fmt);
            setExportAnimKey(k => k + 1);

            // Wait for the export canvas to mount and animation to start
            await new Promise(r => setTimeout(r, 600));

            const result = await exportSingleFormat(fmt);
            results.push(result);
        }

        setExportResults(results);
        setExportFormat(null);
        setIsExporting(false);
        setExportProgress('');
    }, [selectedFormats, exportSingleFormat]);

    const range = filters.years[0] === filters.years[1] ? filters.years[0] : `${filters.years[0]}-${filters.years[1]}`;

    if (!chartData?.timeline?.length) {
        return <div className="step-container animate-fade-in"><p className="error-state">No data available.</p></div>;
    }

    const ChartComponent = isLineType ? LineChartRace : BarChartRace;

    return (
        <div className="step-container animate-fade-in">
            <h2 className="step-title-v2">Preview & Export</h2>

            {/* Preview Area */}
            <div className="preview-export-stage">
                <div className="canvas-wrapper-v2 canvas-wrapper-preview">
                    <ChartComponent
                        key={previewKey}
                        data={chartData.timeline}
                        width={previewLayout.width}
                        height={previewLayout.height}
                        barCount={previewLayout.barCount}
                        isPlaying={isPlaying}
                        speed={visual.speed}
                        onComplete={() => setIsPlaying(false)}
                        title={chartTitle}
                        {...chartExtraProps}
                    />
                </div>

                <div className="playback-console-v2">
                    <button className="ctrl-btn-v2" onClick={handleRestart} type="button" aria-label="Restart">{'\u23EE'}</button>
                    <button className="ctrl-btn-v2 play" onClick={() => setIsPlaying(!isPlaying)} type="button" aria-label={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? '\u23F8' : '\u25B6'}
                    </button>
                    <div className="playback-info-v2">
                        <span className="info-label-v2">Status</span>
                        <span className="info-value-v2">{isPlaying ? 'Playing' : 'Ready'}</span>
                    </div>
                    <div className="playback-info-v2">
                        <span className="info-label-v2">Metric</span>
                        <span className="info-value-v2">{filters.stat?.replace(/_/g, ' ')} &bull; {visual.speed}x</span>
                    </div>
                </div>
            </div>

            {/* Export Section */}
            <div className="export-section">
                <h3 className="export-section-title">Export</h3>

                <div className="format-select-row">
                    <span className="form-label-v2">Select format(s)</span>
                    <div className="format-chips">
                        {FORMAT_OPTIONS.map(fmt => (
                            <button
                                key={fmt.value}
                                className={`format-chip ${selectedFormats.includes(fmt.value) ? 'active' : ''}`}
                                onClick={() => toggleFormat(fmt.value)}
                                disabled={isExporting}
                                type="button"
                            >
                                <span className="format-chip-icon">{fmt.icon}</span>
                                <span>{fmt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {selectedFormats.length > 0 && !isExporting && exportResults.length === 0 && (
                    <Button
                        variant="primary"
                        onClick={startExport}
                        className="export-btn"
                    >
                        Export {selectedFormats.length} video{selectedFormats.length > 1 ? 's' : ''}
                    </Button>
                )}

                {isExporting && (
                    <div className="export-status">
                        <div className="rec-indicator">
                            <div className="rec-dot-v2" />
                            <span>{exportProgress}</span>
                        </div>
                        {/* Hidden export canvas */}
                        {exportFormat && (
                            <div className="export-canvas-offscreen">
                                <ChartComponent
                                    key={`export-${exportAnimKey}`}
                                    ref={exportCanvasRef}
                                    data={chartData.timeline}
                                    width={exportFormat.w}
                                    height={exportFormat.h}
                                    barCount={visual.type === 'bump' || chartData?.meta?.type === 'league_rankings' ? 20 : 10}
                                    isPlaying={true}
                                    speed={visual.speed}
                                    onComplete={handleExportComplete}
                                    title={chartTitle}
                                    {...chartExtraProps}
                                />
                            </div>
                        )}
                    </div>
                )}

                {exportResults.length > 0 && (
                    <div className="export-results">
                        {exportResults.map(r => (
                            <div key={r.format} className="export-result-card">
                                <div className="result-info">
                                    <span className="result-format">{r.format}</span>
                                    <span className="result-meta">{r.width}x{r.height} &bull; {r.size} MB</span>
                                </div>
                                <a
                                    href={r.url}
                                    download={`studio_${filters.stat}_${range}_${r.format.replace(':', 'x')}.webm`}
                                    className="btn-download-v2"
                                >
                                    Download
                                </a>
                            </div>
                        ))}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setExportResults([]); setSelectedFormats([]); }}
                            className="reset-export-btn"
                        >
                            New Export
                        </Button>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <Stack direction="row" gap="md" className="nav-actions-v2">
                <Button variant="secondary" onClick={prevStep} disabled={isExporting} className="back-btn-narrow">
                    &larr; Back
                </Button>
            </Stack>
        </div>
    );
};

export default Step3_PreviewExport;
