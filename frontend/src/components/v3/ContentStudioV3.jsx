import React from 'react';
import { StudioProvider } from './studio/StudioContext';
import StudioWizard from './studio/StudioWizard';
import './ContentStudioV3.css';

const ContentStudioV3 = () => {
    return (
        <StudioProvider>
            <div className="content-studio-page">
                <header className="studio-header">
                    <h1>🎬 Content Studio</h1>
                    <p>Create viral football data animations in minutes.</p>
                </header>
                <main>
                    <StudioWizard />
                </main>
            </div>
        </StudioProvider>
    );
};

export default ContentStudioV3;
