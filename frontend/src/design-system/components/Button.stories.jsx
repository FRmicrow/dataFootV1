import React from 'react';
import Button from './Button';

export default {
    title: 'Design System/Button',
    component: Button,
    argTypes: {
        variant: {
            control: { type: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
        },
        size: {
            control: { type: 'select', options: ['xs', 'sm', 'md', 'lg'] },
        },
        onClick: { action: 'clicked' },
    },
};

const Template = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
    children: 'Primary Button',
    variant: 'primary',
};

export const Secondary = Template.bind({});
Secondary.args = {
    children: 'Secondary Button',
    variant: 'secondary',
};

export const Ghost = Template.bind({});
Ghost.args = {
    children: 'Ghost Button',
    variant: 'ghost',
};

export const Danger = Template.bind({});
Danger.args = {
    children: 'Danger Button',
    variant: 'danger',
};

export const WithIcon = Template.bind({});
WithIcon.args = {
    children: 'Follow Team',
    icon: '⚽',
};

export const Loading = Template.bind({});
Loading.args = {
    children: 'Saving...',
    loading: true,
};

export const Large = Template.bind({});
Large.args = {
    children: 'Large Action',
    size: 'lg',
};
