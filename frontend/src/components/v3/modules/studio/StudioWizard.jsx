import React from 'react';
import { useStudio } from './StudioContext';
import './StudioWizard.css';

// Step components (will create these next)
import Step1_Data from './Step1_Data';
import Step2_Config from './Step2_Config';
import Step3_Preview from './Step3_Preview';
import Step4_Export from './Step4_Export';

const StudioWizard = () => {
    const { step, goToStep, error } = useStudio();

    // Render active step content
    const renderStep = () => {
        switch (step) {
            case 1: return <Step1_Data />;
            case 2: return <Step2_Config />;
            case 3: return <Step3_Preview />;
            case 4: return <Step4_Export />;
            default: return <Step1_Data />;
        }
    };

    return (
        <div className="studio-container">
            {/* Wizard Header / Stepper */}
            <div className="studio-stepper">
                <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} onClick={() => step > 1 && goToStep(1)}>
                    <span className="step-num">1</span>
                    <span className="step-label">Data Source</span>
                </div>
                <div className="step-line"></div>
                <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} onClick={() => step > 2 && goToStep(2)}>
                    <span className="step-num">2</span>
                    <span className="step-label">Configuration</span>
                </div>
                <div className="step-line"></div>
                <div className={`step-item ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`} onClick={() => step > 3 && goToStep(3)}>
                    <span className="step-num">3</span>
                    <span className="step-label">Animation</span>
                </div>
                <div className="step-line"></div>
                <div className={`step-item ${step === 4 ? 'active' : ''}`} onClick={() => step > 4 && goToStep(4)}>
                    <span className="step-num">4</span>
                    <span className="step-label">Export</span>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="studio-error-banner">
                    ⚠️ {error}
                </div>
            )}

            {/* Step Content */}
            <div className="studio-content">
                {renderStep()}
            </div>
        </div>
    );
};

export default StudioWizard;
