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
        <div className="step-container">
            <h2>Configure Visuals</h2>

            {/* Chart Type Selection */}
            <div className="config-section">
                <h3>Chart Type</h3>
                <div className="card-grid">
                    <div
                        className={`config-card ${visual.type === 'bar_race' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('bar_race')}
                    >
                        <div className="card-icon">📊</div>
                        <h4>Bar Chart Race</h4>
                        <p>Dynamic ranking evolution over time.</p>
                    </div>

                    <div
                        className={`config-card ${visual.type === 'line' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('line')}
                    >
                        <div className="card-icon">📈</div>
                        <h4>Line Evolution</h4>
                        <p>Compare progress (Points) over time (Matchdays).</p>
                    </div>

                    <div
                        className={`config-card ${visual.type === 'league_race' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('league_race')}
                    >
                        <div className="card-icon">🏁</div>
                        <h4>Racing Standings</h4>
                        <p>League table evolution with jumping positions.</p>
                    </div>

                    <div
                        className={`config-card ${visual.type === 'bump' ? 'active' : ''}`}
                        onClick={() => handleTypeChange('bump')}
                    >
                        <div className="card-icon">🎢</div>
                        <h4>Bump Ranking</h4>
                        <p>Rank evolution flow (Round by Round).</p>
                    </div>
                </div>
            </div>

            {/* Format Selection */}
            <div className="config-section">
                <h3>Video Format</h3>
                <div className="format-options">
                    <div
                        className={`format-btn ${visual.format === '9:16' ? 'active' : ''}`}
                        onClick={() => handleFormatChange('9:16')}
                    >
                        <span className="icon">📱</span> V (9:16)
                    </div>
                    <div
                        className={`format-btn ${visual.format === '1:1' ? 'active' : ''}`}
                        onClick={() => handleFormatChange('1:1')}
                    >
                        <span className="icon">📷</span> Sq (1:1)
                    </div>
                    <div
                        className={`format-btn ${visual.format === '16:9' ? 'active' : ''}`}
                        onClick={() => handleFormatChange('16:9')}
                    >
                        <span className="icon">💻</span> H (16:9)
                    </div>
                </div>
            </div>

            {/* Styling Options */}
            <div className="config-section">
                <div className="row-options">
                    <div className="option-col">
                        <label>Color Theme</label>
                        <select value={visual.theme} onChange={(e) => handleThemeChange(e.target.value)}>
                            <option value="v3_dark">V3 Dark (Premium)</option>
                            <option value="light">Clean Light</option>
                            <option value="neon">Cyber Neon</option>
                        </select>
                    </div>

                    <div className="option-col">
                        <label>Animation Speed ({visual.speed}x)</label>
                        <input
                            type="range"
                            min="0.5"
                            max="3.0"
                            step="0.5"
                            value={visual.speed}
                            onChange={handleSpeedChange}
                        />
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="step-actions">
                <button className="btn-back" onClick={prevStep}>← Back</button>
                <button className="btn-next" onClick={() => goToStep(3)}>
                    Next: Preview Animation →
                </button>
            </div>
        </div>
    );
};

export default Step2_Config;
