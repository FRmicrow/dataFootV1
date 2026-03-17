import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    if (id.includes('react-router-dom')) return 'vendor-router';
                    if (
                        id.includes('/react/') ||
                        id.includes('/react-dom/') ||
                        id.includes('/scheduler/') ||
                        id.includes('/prop-types/')
                    ) {
                        return 'vendor-core';
                    }
                    if (id.includes('/react-select/')) return 'vendor-select';
                    if (id.includes('/axios/')) return 'vendor-axios';
                    return 'vendor-core';
                }
            }
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
                changeOrigin: true
            }
        }
    }
});
