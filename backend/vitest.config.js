import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        exclude: ['node_modules/**', 'node_modules_host_backup/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'lcov'],
            reportsDirectory: './coverage',
            exclude: ['node_modules/', 'src/config/', '**/test/**']
        }
    }
});
