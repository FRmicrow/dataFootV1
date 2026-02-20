
import footballApi from '../services/footballApi.js';

const run = async () => {
    try {
        console.log("Searching for FUTURE match (Premier League)...");
        // Try to find a match in next 7 days
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        console.log(`Searching from ${today} to ${nextWeek}...`);

        const res = await footballApi.makeRequest('/fixtures', {
            league: 39,
            season: 2025, // Assuming 2025-2026 season is happening now (since date is 2026-02)
            from: today,
            to: nextWeek
        });

        if (res.response && res.response.length > 0) {
            const fixture = res.response[0];
            console.log(`Found Future Match: ${fixture.teams.home.name} vs ${fixture.teams.away.name} (ID: ${fixture.fixture.id})`);

            console.log("Fetching Odds...");
            const oddsRes = await footballApi.getOdds({ fixture: fixture.fixture.id });
            console.log("Odds Response:", JSON.stringify(oddsRes, null, 2).substring(0, 500) + "...");
        } else {
            console.log("No Premier League matches found for next week?");
        }

    } catch (err) {
        console.error("Test Error:", err);
    }
};

run();
