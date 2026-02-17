import footballApi from './src/services/footballApi.js';

// Choose a recent high-profile match ID (e.g. Premier League or Champions League)
// where advanced data is likely to be present.
// Example: Man City vs Real Madrid or similar.
// I'll use a placeholder or search for a fixture first?
// I'll try to find a fixture ID from the project or use a known one.
// Let's just try to fetch fixtures first to get a valid ID.

async function testEventData() {
    try {
        console.log("1. Fetching a recent completed fixture...");
        // Get fixtures for a league (e.g. Premier League 39, Season 2023)
        const fixtures = await footballApi.getFixtures(39, 2023);
        const completed = fixtures.response.filter(f => f.fixture.status.short === 'FT');

        if (completed.length === 0) {
            console.log("No completed fixtures found.");
            return;
        }

        const targetFixture = completed[0];
        console.log(`Target Fixture: ${targetFixture.teams.home.name} vs ${targetFixture.teams.away.name} (ID: ${targetFixture.fixture.id})`);

        console.log("2. Fetching Events...");
        const events = await footballApi.getFixtureEvents(targetFixture.fixture.id);

        if (events.response.length > 0) {
            console.log("Sample Event:", JSON.stringify(events.response[0], null, 2));

            // Check for specific interesting fields in ANY event
            const specialEvents = events.response.filter(e => e.detail && (e.detail.includes('Goal') || e.detail.includes('Card') || e.comments));
            if (specialEvents.length > 0) {
                console.log("Special Event Sample:", JSON.stringify(specialEvents[0], null, 2));
            }
        } else {
            console.log("No events returned.");
        }

        console.log("3. Fetching Advanced Player Stats (if available)...");
        const stats = await footballApi.getFixturePlayerStatistics(targetFixture.fixture.id);
        if (stats.response.length > 0) {
            console.log("Sample Player Stats:", JSON.stringify(stats.response[0].players[0].statistics[0], null, 2));
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

testEventData();
