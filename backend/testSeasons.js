import footballApi from './src/services/footballApi.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const playerId = 19088; // Hamza Igamane

    console.log(`Checking seasons for player ${playerId}...`);
    try {
        const data = await footballApi.getSeasons(playerId);
        console.log('Seasons Response:', JSON.stringify(data, null, 2));

        if (data.response) {
            for (const season of data.response) {
                const stats = await footballApi.getPlayerStatistics(playerId, season);
                console.log(`Season ${season}: ${stats.response?.length || 0} records`);
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
