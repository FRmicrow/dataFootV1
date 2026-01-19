import footballApi from './src/services/footballApi.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const playerId = 306979; // Hamza Igamane
    const season = 2023;

    console.log(`Testing stats for player ${playerId} season ${season}...`);
    try {
        const data = await footballApi.getPlayerStatistics(playerId, season);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
