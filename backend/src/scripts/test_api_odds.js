
import footballApi from '../services/footballApi.js';

const run = async () => {
    try {
        // Premier League match from 2023 or 2024?
        // Let's search for a fixture ID first.
        console.log("Searching for Arsenal vs Liverpool...");
        const res = await footballApi.makeRequest('/fixtures', {
            league: 39, // Premier League
            season: 2023,
            status: 'FT'
        });

        if (res.response && res.response.length > 0) {
            const fixture = res.response[0];
            console.log(`Found Match: ${fixture.teams.home.name} vs ${fixture.teams.away.name} (ID: ${fixture.fixture.id})`);

            console.log("Fetching Odds...");
            const oddsRes = await footballApi.getOdds({ fixture: fixture.fixture.id });
            console.log("Odds Response:", JSON.stringify(oddsRes, null, 2).substring(0, 500) + "...");
        } else {
            console.log("No Premier League matches found for 2023?");
        }

    } catch (err) {
        console.error("Test Error:", err);
    }
};

run();
