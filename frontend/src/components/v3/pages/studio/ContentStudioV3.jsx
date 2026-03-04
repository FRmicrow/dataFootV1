import React from 'react';
import { StudioProvider } from '../../modules/studio/StudioContext';
import StudioWizard from '../../modules/studio/StudioWizard';
import './ContentStudioV3.css';

const ContentStudioV3 = () => {
    return (
        <StudioProvider>
            <div className="content-studio-page animate-fade-in">
                <header className="v3-header studio">
                    <div className="header-meta">
                        <span className="hub-badge">CONTENT PRODUCTION</span>
                        <h1 className="hub-title">Data Studio</h1>
                        <p className="hub-subtitle">Engineered for viral professional data visualization</p>
                    </div>
                </header>
                <main>
                    <StudioWizard />
                </main>
            </div>
        </StudioProvider>
    );
};

export default ContentStudioV3;
