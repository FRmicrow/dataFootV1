import React from 'react';
import { useStudio } from './StudioContext';
import './Step2_Config.css';

const Step2_Config = () => {
    const {
        visual, setVisual,
        goToStep, prevStep
    } = useStudio();

    const handleTypeChange = (type) => setVisual(prev => ({ ...prev, type }));
    const handleFormatChange = (format) => setVisual(prev => ({ ...prev, format }));
    const handleSpeedChange = (e) => setVisual(prev => ({ ...prev, speed: parseFloat(e.target.value) }));
    const handleThemeChange = (theme) => setVisual(prev => ({ ...prev, theme }));

    return (
        <div className="step-container animate-fade-in">
            <h2 className="step-title-v2">Visual Intelligence Configuration</h2>

            {/* Chart Type Selection */}
            <div className="form-group-v2">
                <label className="form-label-v2">Visualization Blueprint</label>
                <div className="config-grid-v2">
                    <div
                        className={`config-card-v2 ${visual.type === 'bar_race' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('bar_race')}
                    >
                        <div className="card-icon-v2">📊</div>
                        <h4 className="card-title-v2">Bar Chart Race</h4>
                        <p className="card-desc-v2">Dynamic ranking evolution with high-density temporal shifting.</p>
                    </div>

                    <div
                        className={`config-card-v2 ${visual.type === 'line' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('line')}
                    >
                        <div className="card-icon-v2">📈</div>
                        <h4 className="card-title-v2">Trajectory Line</h4>
                        <p className="card-desc-v2">Precise comparative progress analysis over multiple match cycles.</p>
                    </div>

                    <div
                        className={`config-card-v2 ${visual.type === 'league_race' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('league_race')}
                    >
                        <div className="card-icon-v2">🏁</div>
                        <h4 className="card-title-v2">Standings Pulse</h4>
                        <p className="card-desc-v2">Real-time championship table movement simulation.</p>
                    </div>

                    <div
                        className={`config-card-v2 ${visual.type === 'bump' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('bump')}
                    >
                        <div className="card-icon-v2">🎢</div>
                        <h4 className="card-title-v2">Bump Matrix</h4>
                        <p className="card-desc-v2">Fluid rank evolution flow mapping connectivity and trends.</p>
                    </div>
                </div>
            </div>

            {/* Row Options: Theme & Format */}
            <div className="options-row-v2">
                <div className="form-group-v2">
                    <label className="form-label-v2">Atmospheric Theme</label>
                    <select value={visual.theme} onChange={(e) => handleThemeChange(e.target.value)} className="input-v2">
                        <option value="v3_dark">V3 Obsidian (Signature)</option>
                        <option value="light">Clinical White</option>
                        <option value="neon">Electric Cyber</option>
                    </select>
                </div>

                <div className="form-group-v2">
                    <label className="form-label-v2">Output Aspect Ratio</label>
                    <div className="format-grid-v2">
                        <div
                            className={`format-btn-v2 ${visual.format === '9:16' ? 'active' : ''}`}
                            onClick={() => handleFormatChange('9:16')}
                        >
                            <span className="format-icon-v2">📱</span> <span>9:16</span>
                        </div>
                        <div
                            className={`format-btn-v2 ${visual.format === '1:1' ? 'active' : ''}`}
                            onClick={() => handleFormatChange('1:1')}
                        >
                            <span className="format-icon-v2">📷</span> <span>1:1</span>
                        </div>
                        <div
                            className={`format-btn-v2 ${visual.format === '16:9' ? 'active' : ''}`}
                            onClick={() => handleFormatChange('16:9')}
                        >
                            <span className="format-icon-v2">💻</span> <span>16:9</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Animation Speed */}
            <div className="form-group-v2">
                <label className="form-label-v2">Kinetic Velocity</label>
                <div className="slider-container-v2">
                    <div className="slider-header-v2">
                        <span className="slider-label-v2" style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TRANSITION PACE</span>
                        <span className="slider-value-v2" style={{ color: '#6366f1', fontWeight: 800 }}>{visual.speed}x</span>
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
            <div className="nav-actions-v2">
                <button className="btn-secondary-v2" onClick={prevStep}>← Adjust Registry</button>
                <button className="btn-primary-v2" style={{ flex: 1 }} onClick={() => goToStep(3)}>
                    Synchronize Preview →
                </button>
            </div>
        </div>
    );
};

export default Step2_Config;
