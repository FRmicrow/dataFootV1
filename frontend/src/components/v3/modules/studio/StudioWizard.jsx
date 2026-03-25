import React from 'react';
import { useStudio } from './StudioContext';
import { Button } from '../../../../design-system';
import './StudioWizard.css';

import Step1_Data from './Step1_Data';
import Step3_PreviewExport from './Step3_PreviewExport';

const StudioWizard = () => {
    const { step, goToStep, resetWizard, error } = useStudio();

    const renderStep = () => {
        switch (step) {
            case 1: return <Step1_Data />;
            case 2: return <Step3_PreviewExport />;
            default: return <Step1_Data />;
        }
    };

    return (
        <div className="studio-container">
            <div className="studio-wizard-top">
                <div className="studio-stepper">
                    <button
                        className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
                        onClick={() => step > 1 && goToStep(1)}
                        disabled={step <= 1}
                        type="button"
                    >
                        <span className="step-num">1</span>
                        <span className="step-label">Data & Config</span>
                    </button>
                    <div className="step-line"></div>
                    <button
                        className={`step-item ${step === 2 ? 'active' : ''}`}
                        disabled={step <= 2}
                        type="button"
                    >
                        <span className="step-num">2</span>
                        <span className="step-label">Preview & Export</span>
                    </button>
                </div>
                {step >= 2 && (
                    <Button variant="ghost" size="sm" onClick={resetWizard}>
                        + New
                    </Button>
                )}
            </div>

            {error && (
                <div className="studio-error-banner">
                    {error}
                </div>
            )}

            <div className="studio-content">
                {renderStep()}
            </div>
        </div>
    );
};

export default StudioWizard;
