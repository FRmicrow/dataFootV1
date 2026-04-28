import React from 'react';
import MissingDataBadge from './MissingDataBadge';

export default {
    title: 'Design System/MissingDataBadge',
    component: MissingDataBadge,
    argTypes: {
        severity: {
            control: { type: 'select', options: ['critical', 'optional'] },
        },
        size: {
            control: { type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
        },
    },
};

const Template = (args) => <MissingDataBadge {...args} />;

export const CriticalGoals = Template.bind({});
CriticalGoals.args = {
    label: 'Buts saison 2025-26',
    severity: 'critical',
};

export const CriticalXG = Template.bind({});
CriticalXG.args = {
    label: 'xG (Mbappé, saison 2025-26)',
    severity: 'critical',
};

export const OptionalPhoto = Template.bind({});
OptionalPhoto.args = {
    label: 'Photo de profil',
    severity: 'optional',
};

export const OptionalAssists = Template.bind({});
OptionalAssists.args = {
    label: 'Passes décisives',
    severity: 'optional',
};

export const Stack = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
        <MissingDataBadge label="Buts saison 2025-26" severity="critical" />
        <MissingDataBadge label="xG (Mbappé)"          severity="critical" />
        <MissingDataBadge label="Photo de profil"      severity="optional" />
        <MissingDataBadge label="Logo du club"         severity="optional" />
    </div>
);
