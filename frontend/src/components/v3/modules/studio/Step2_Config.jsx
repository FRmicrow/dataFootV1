import React from 'react';
import { useStudio } from './StudioContext';
import { Button, Select, Grid, Stack } from '../../../../design-system';
import './Step2_Config.css';

const Step2_Config = () => {
    const {
        visual, setVisual,
        goToStep, prevStep
    } = useStudio();

    const handleTypeChange = (type) => setVisual(prev => ({ ...prev, type }));
    const handleFormatChange = (format) => setVisual(prev => ({ ...prev, format }));
    const handleSpeedChange = (e) => setVisual(prev => ({ ...prev, speed: Number.parseFloat(e.target.value) }));
    const handleThemeChange = (theme) => setVisual(prev => ({ ...prev, theme }));

    return (
        <div className="step-container animate-fade-in">
            <h2 className="step-title-v2">Chart & Animation Settings</h2>

            {/* Chart Type Selection */}
            <Stack gap="md" className="form-group-v2">
                <label className="form-label-v2">Chart Layout</label>
                <Grid columns="repeat(auto-fit, minmax(220px, 1fr))" gap="md" className="config-grid-v2">
                    <button
                        className={`config-card-v2 ${visual.type === 'bar_race' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('bar_race')}
                        type="button"
                    >
                        <div className="card-icon-v2">📊</div>
                        <h4 className="card-title-v2">Ranking bar chart</h4>
                        <p className="card-desc-v2">Ordered comparison of totals evolving over time.</p>
                    </button>

                    <button
                        className={`config-card-v2 ${visual.type === 'line' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('line')}
                        type="button"
                    >
                        <div className="card-icon-v2">📈</div>
                        <h4 className="card-title-v2">Trend line</h4>
                        <p className="card-desc-v2">Comparative progress analysis across multiple periods.</p>
                    </button>

                    <button
                        className={`config-card-v2 ${visual.type === 'league_race' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('league_race')}
                        type="button"
                    >
                        <div className="card-icon-v2">🏁</div>
                        <h4 className="card-title-v2">Standing bar race</h4>
                        <p className="card-desc-v2">Animated ranking of clubs over specific matchdays.</p>
                    </button>

                    <button
                        className={`config-card-v2 ${visual.type === 'bump' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('bump')}
                        type="button"
                    >
                        <div className="card-icon-v2">🎢</div>
                        <h4 className="card-title-v2">Bump chart</h4>
                        <p className="card-desc-v2">Visualizes ranking changes and position fluctuations.</p>
                    </button>
                </Grid>
            </Stack>

            {/* Row Options: Theme & Format */}
            <Grid columns="1fr 1fr" gap="2rem" className="options-row-v2">
                <Stack gap="sm" className="form-group-v2">
                    <label className="form-label-v2">Visual Theme</label>
                    <Select
                        options={[
                            { value: 'v3_dark', label: 'V3 Obsidian (Signature)' },
                            { value: 'light', label: 'Clinical White' },
                            { value: 'neon', label: 'Electric Cyber' }
                        ]}
                        value={visual.theme}
                        onChange={handleThemeChange}
                    />
                </Stack>

                <Stack gap="sm" className="form-group-v2">
                    <label className="form-label-v2">Output Aspect Ratio</label>
                    <Grid columns="repeat(3, 1fr)" gap="0.75rem" className="format-grid-v2">
                        <button
                            className={`format-btn-v2 ${visual.format === '9:16' ? 'active' : ''}`}
                            onClick={() => handleFormatChange('9:16')}
                            type="button"
                        >
                            <span className="format-icon-v2">📱</span> <span>9:16</span>
                        </button>
                        <button
                            className={`format-btn-v2 ${visual.format === '1:1' ? 'active' : ''}`}
                            onClick={() => handleFormatChange('1:1')}
                            type="button"
                        >
                            <span className="format-icon-v2">📷</span> <span>1:1</span>
                        </button>
                        <button
                            className={`format-btn-v2 ${visual.format === '16:9' ? 'active' : ''}`}
                            onClick={() => handleFormatChange('16:9')}
                            type="button"
                        >
                            <span className="format-icon-v2">💻</span> <span>16:9</span>
                        </button>
                    </Grid>
                </Stack>
            </Grid>

            <div className="form-group-v2">
                <label className="form-label-v2">Animation Speed</label>
                <div className="slider-container-v2">
                    <div className="slider-header-v2">
                        <span className="slider-label-v2">TRANSITION PACE</span>
                        <span className="slider-value-v2">{visual.speed}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.5"
                        value={visual.speed}
                        onChange={handleSpeedChange}
                        className="slider-v2"
                    />
                </div>
            </div>

            {/* Navigation */}
            <Stack direction="row" gap="md" className="nav-actions-v2">
                <Button variant="secondary" onClick={prevStep} style={{ flex: 0.4 }}>← Adjust Registry</Button>
                <Button variant="primary" onClick={() => goToStep(3)} style={{ flex: 1 }}>
                    Synchronize Preview →
                </Button>
            </Stack>
        </div>
    );
};

export default Step2_Config;
