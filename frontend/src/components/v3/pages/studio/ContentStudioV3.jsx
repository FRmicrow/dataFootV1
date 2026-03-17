import React from 'react';
import { StudioProvider } from '../../modules/studio/StudioContext';
import StudioWizard from '../../modules/studio/StudioWizard';
import { PageLayout, PageHeader, PageContent } from '../../layouts';

const ContentStudioV3 = () => {
    return (
        <StudioProvider>
            <PageLayout className="animate-fade-in">
                <PageHeader
                    title="Studio"
                    subtitle="Engineered for viral professional data visualization"
                    badge={{ label: 'CONTENT', variant: 'accent' }}
                />
                <PageContent>
                    <StudioWizard />
                </PageContent>
            </PageLayout>
        </StudioProvider>
    );
};

export default ContentStudioV3;
