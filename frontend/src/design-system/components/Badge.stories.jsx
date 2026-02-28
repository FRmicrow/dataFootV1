import React from 'react';
import Badge from './Badge';

export default {
    title: 'Design System/Badge',
    component: Badge,
    argTypes: {
        variant: {
            control: { type: 'select', options: ['neutral', 'primary', 'success', 'warning', 'danger'] },
        },
        size: {
            control: { type: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
        },
    },
};

const Template = (args) => <Badge {...args} />;

export const Neutral = Template.bind({});
Neutral.args = {
    children: 'Stable',
    variant: 'neutral',
};

export const Primary = Template.bind({});
Primary.args = {
    children: 'Live Match',
    variant: 'primary',
};

export const Success = Template.bind({});
Success.args = {
    children: 'Completed',
    variant: 'success',
};

export const Warning = Template.bind({});
Warning.args = {
    children: 'Impending',
    variant: 'warning',
};

export const Danger = Template.bind({});
Danger.args = {
    children: 'High Alert',
    variant: 'danger',
};

export const Small = Template.bind({});
Small.args = {
    children: 'v1.0',
    size: 'xs',
};
