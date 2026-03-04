import React from 'react';
import { useStudio } from './StudioContext';

const Step2Config = () => {
    const { wizardData, updateWizardData } = useStudio();

    return (
        <div className="step-container">
            <h2>Visual Configuration</h2>

            <div className="form-group">
                <label className="form-label">Chart Type</label>
                <select
                    className="form-control"
                    value={wizardData.chartType}
                    onChange={(e) => updateWizardData({ chartType: e.target.value })}
                >
                    <option value="bar_race">Bar Chart Race</option>
                    <option value="line_evolution">Line Evolution</option>
                    <option value="radar">Radar Comparison</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Theme</label>
                <select
                    className="form-control"
                    value={wizardData.theme}
                    onChange={(e) => updateWizardData({ theme: e.target.value })}
                >
                    <option value="v3_dark">V3 Dark (Default)</option>
                    <option value="light">Light Mode</option>
                    <option value="neon">Neon Cyberpunk</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Animation Speed ({wizardData.speed}x)</label>
                <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={wizardData.speed}
                    onChange={(e) => updateWizardData({ speed: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                />
            </div>

            <div className="form-group">
                <label className="form-label">Format / Aspect Ratio</label>
                <div className="radio-group">
                    {['9:16', '1:1', '16:9'].map(f => (
                        <label key={f} className="radio-label">
                            <input
                                type="radio"
                                name="format"
                                value={f}
                                checked={wizardData.format === f}
                                onChange={(e) => updateWizardData({ format: e.target.value })}
                            />
                            {f}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Step2Config;
