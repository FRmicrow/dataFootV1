/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: 'var(--color-primary-50)',
                    100: 'var(--color-primary-100)',
                    200: 'var(--color-primary-200)',
                    300: 'var(--color-primary-300)',
                    400: 'var(--color-primary-400)',
                    500: 'var(--color-primary-500)',
                    600: 'var(--color-primary-600)',
                    700: 'var(--color-primary-700)',
                    800: 'var(--color-primary-800)',
                    900: 'var(--color-primary-900)',
                },
                bg: {
                    main: 'var(--color-bg-main)',
                    card: 'var(--color-bg-card)',
                    sidebar: 'var(--color-bg-sidebar)',
                },
                border: 'var(--color-border)',
            },
            borderRadius: {
                sm: 'var(--radius-sm)',
                md: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
                xl: 'var(--radius-xl)',
            },
            fontFamily: {
                sans: 'var(--font-family)',
                mono: 'var(--font-family-mono)',
            }
        },
    },
    plugins: [],
    darkMode: 'class', // Default to class for more control
}
