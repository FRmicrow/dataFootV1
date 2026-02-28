export const parameters = {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
        matchers: {
            color: /(background|color)$/i,
            date: /Date$/,
        },
    },
    backgrounds: {
        default: 'dark',
        values: [
            { name: 'dark', value: '#0f172a' },
            { name: 'light', value: '#f8fafc' },
        ],
    },
};
