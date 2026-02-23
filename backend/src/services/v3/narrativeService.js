import db from '../../config/database.js';

/**
 * Narrative Context Encoder (US_153)
 * Enriches match data with "soft" context: Derbies, Stakes, and Environmental factors.
 */

// Major Global Rivalries (Hardcoded mapping for AC 4)
const MAJOR_RIVALRIES = [
    { teams: [541, 529], name: "El Clásico", importance: 1.0 }, // Real Madrid vs Barcelona
    { teams: [40, 33], name: "North West Derby", importance: 0.9 }, // Liverpool vs Man Utd
    { teams: [85, 81], name: "Le Classique", importance: 0.8 }, // PSG vs Marseille
    { teams: [80, 1063], name: "Derby du Rhône", importance: 0.7 }, // Lyon vs Saint-Etienne
    { teams: [505, 489], name: "Derby della Madonnina", importance: 0.9 }, // Inter vs Milan
    { teams: [505, 496], name: "Derby d'Italia", importance: 0.9 }, // Inter vs Juventus
    { teams: [42, 47], name: "North London Derby", importance: 0.85 }, // Arsenal vs Tottenham
    { teams: [247, 257], name: "The Old Firm", importance: 0.95 }, // Celtic vs Rangers
    { teams: [487, 497], name: "Derby della Capitale", importance: 0.85 }, // Lazio vs Roma
    { teams: [211, 212], name: "O Clássico", importance: 0.8 }, // Benfica vs Porto
    { teams: [211, 228], name: "Derby de Lisboa", importance: 0.8 }, // Benfica vs Sporting CP
    { teams: [194, 209], name: "De Klassieker", importance: 0.8 }, // Ajax vs Feyenoord
    { teams: [50, 33], name: "Manchester Derby", importance: 0.85 }, // Man City vs Man Utd
    { teams: [157, 165], name: "Der Klassiker", importance: 0.85 }, // Bayern vs Dortmund
];

// City Coordinates (approximate for distance calculation)
const CITY_COORDS = {
    "London": [51.5074, -0.1278],
    "Madrid": [40.4168, -3.7038],
    "Barcelona": [41.3851, 2.1734],
    "Paris": [48.8566, 2.3522],
    "Marseille": [43.2965, 5.3698],
    "Manchester": [53.4808, -2.2426],
    "Liverpool": [53.4084, -2.9916],
    "Milan": [45.4642, 9.1900],
    "Turin": [45.0703, 7.6869],
    "Munich": [48.1351, 11.5820],
    "Dortmund": [51.5136, 7.4653],
    "Glasgow": [55.8642, -4.2518],
    "Lisbon": [38.7223, -9.1393],
    "Porto": [41.1579, -8.6291],
    "Amsterdam": [52.3676, 4.9041],
    "Istanbul": [41.0082, 28.9784],
    "Rome": [41.9028, 12.4964]
};

export class NarrativeService {
    /**
     * Determines if a match is a Derby (AC 1)
     */
    static getDerbyContext(homeTeam, awayTeam, homeVenue) {
        // 1. Check same city
        const isSameCity = homeTeam.city && awayTeam.city && homeTeam.city === awayTeam.city;

        // 2. Check hardcoded rivalries
        const rivalry = MAJOR_RIVALRIES.find(r =>
            (r.teams.includes(homeTeam.api_id) && r.teams.includes(awayTeam.api_id))
        );

        if (rivalry) {
            return { is_derby: true, name: rivalry.name, importance: rivalry.importance };
        }

        if (isSameCity) {
            return { is_derby: true, name: `City Derby (${homeTeam.city})`, importance: 0.6 };
        }

        return { is_derby: false };
    }

    /**
     * Calculates Travel Impact (AC 3)
     */
    static calculateTravelImpact(homeVenue, awayTeamVenue) {
        if (!homeVenue?.city || !awayTeamVenue?.city) return 0;

        const c1 = CITY_COORDS[homeVenue.city];
        const c2 = CITY_COORDS[awayTeamVenue.city];

        if (!c1 || !c2) return 0; // Unknown cities

        // Haversine formula
        const R = 6371; // km
        const dLat = (c2[0] - c1[0]) * Math.PI / 180;
        const dLon = (c2[1] - c1[1]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(c1[0] * Math.PI / 180) * Math.cos(c2[0] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return Math.round(distance);
    }

    /**
     * Classifies Match Stakes (AC 2)
     */
    static getMatchStakes(fixture, league, homeTeamStatus, awayTeamStatus) {
        const round = fixture.round?.toLowerCase() || '';

        // Finals
        if (round.includes('final')) return 'ULTRA-HIGH';
        if (round.includes('semi-final')) return 'HIGH';
        if (round.includes('quarter-final')) return 'HIGH';

        // Relegation play-offs
        if (round.includes('relegation')) return 'CRITICAL';

        // Dead rubber logic (Simplified: if it's the last 3 rounds and both are mid-table)
        // Requires standings data which we might not have in real-time context.
        // For now, return 'REGULAR'
        return 'REGULAR';
    }

    /**
     * Encodes full narrative context for a match
     */
    static async encodeContext(fixtureId) {
        const sql = `
            SELECT f.*, 
                   hv.city as home_city, hv.name as home_venue,
                   av.city as away_city, av.name as away_venue
            FROM V3_Fixtures f
            LEFT JOIN V3_Venues hv ON f.venue_id = hv.api_id
            LEFT JOIN V3_Teams ht ON f.home_team_id = ht.api_id
            LEFT JOIN V3_Teams at ON f.away_team_id = at.api_id
            LEFT JOIN V3_Venues av ON at.venue_id = av.api_id
            WHERE f.fixture_id = ?
        `;

        const fixture = db.get(sql, [fixtureId]);
        if (!fixture) return null;

        const homeTeam = { api_id: fixture.home_team_id, city: fixture.home_city };
        const awayTeam = { api_id: fixture.away_team_id, city: fixture.away_city };
        const homeVenue = { city: fixture.home_city };
        const awayTeamVenue = { city: fixture.away_city };

        const derby = this.getDerbyContext(homeTeam, awayTeam, homeVenue);
        const travelDistance = this.calculateTravelImpact(homeVenue, awayTeamVenue);
        const stakes = this.getMatchStakes(fixture, null, null, null);

        return {
            derby,
            travel_km: travelDistance,
            stakes,
            pressure_index: stakes === 'CRITICAL' || stakes === 'ULTRA-HIGH'
        };
    }
}

export default NarrativeService;
