
import axios from 'axios';
import 'dotenv/config';

const API_KEY = process.env.API_FOOTBALL_KEY || process.env.API_INITIAL_KEY;
const API_BASE_URL = 'https://v3.football.api-sports.io';

async function testPlayerEndpoint() {
    const playerId = 276; // Neymar
    // Try without season
    try {
        console.log(`Fetching player ${playerId} without season...`);
        const res = await axios.get(`${API_BASE_URL}/players`, {
            params: { id: playerId },
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            }
        });

        console.log("Response length:", res.data.response.length);
        if (res.data.response.length > 0) {
            console.log(" Seasons returned:");
            res.data.response.forEach(item => {
                const stats = item.statistics;
                stats.forEach(s => console.log(` - ${s.league.name} ${s.league.season}`));
            });
        } else {
            console.log("No data returned or empty response.");
            console.log(res.data);
        }

    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}

testPlayerEndpoint();
