import React from 'react';
import LeagueCard from './LeagueCard';

export default {
    title: 'Components/LeagueCard',
    component: LeagueCard,
};

const Template = (args) => <div style={{ width: '320px' }}><LeagueCard {...args} /></div>;

export const Default = Template.bind({});
Default.args = {
    name: 'Premier League',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    rank: 1,
    seasonsCount: 15,
    countryName: 'England',
    countryFlag: 'https://media.api-sports.io/flags/gb.svg'
};

export const Featured = Template.bind({});
Featured.args = {
    ...Default.args,
    featured: true
};

export const Cup = Template.bind({});
Cup.args = {
    ...Default.args,
    name: 'UEFA Champions League',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    isCup: true,
    countryName: 'Europe'
};
