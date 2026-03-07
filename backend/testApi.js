import 'dotenv/config';
import footballApi from './src/services/footballApi.js';

async function test() {
    try {
        console.log('Testing Football API...');
        const res = await footballApi.getCountries();
        console.log('Success! Found countries:', res.response?.length || 0);
        process.exit(0);
    } catch (err) {
        console.error('API Error:', err.message);
        process.exit(1);
    }
}
test();
