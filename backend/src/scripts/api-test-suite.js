import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

const testEndpoints = async () => {
    console.log('🧪 Starting StatFoot V3 API Test Suite...\n');

    const endpoints = [
        { name: 'Countries', url: '/countries', method: 'get' },
        { name: 'Leagues', url: '/leagues', method: 'get' },
        { name: 'Import Matrix Status', url: '/import/matrix-status', method: 'get' },
        { name: 'Import State', url: '/import/state', method: 'get' },
        { name: 'Discovery Countries', url: '/import/discovery/countries', method: 'get' },
        { name: 'ML Orchestrator Status', url: '/ml-platform/orchestrator/status', method: 'get' }
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`📡 Testing ${endpoint.name}: [${endpoint.method.toUpperCase()}] ${BASE_URL}${endpoint.url}`);
            const response = await axios[endpoint.method](`${BASE_URL}${endpoint.url}`);
            if (response.data && response.data.success) {
                console.log(`✅ ${endpoint.name} - Success!\n`);
            } else {
                console.warn(`⚠️ ${endpoint.name} - Responded but success flag is false.\n`);
            }
        } catch (err) {
            console.error(`❌ ${endpoint.name} - FAILED: ${err.message}\n`);
        }
    }

    console.log('🏁 API Test Suite Complete.');
};

testEndpoints();
