import axios from 'axios';
import db from '../src/config/database.js';

const playerId = 31; // Local ID for player with many seasons

async function testSync() {
    try {
        console.log(`🔄 Syncing player ${playerId}...`);
        const response = await axios.post(`http://localhost:3001/api/player/${playerId}/sync`);
        console.log('✅ Sync response:', response.data.message || 'Success');

        await db.init();
        const stats = db.all('SELECT * FROM player_club_stats WHERE player_id = ? ORDER BY season_id DESC LIMIT 3', [playerId]);

        console.log('\n📊 Checked stats for Player 31 (Club):');
        stats.forEach(s => {
            console.log(`Season ${s.season_id}: Matches=${s.matches}, Goals=${s.goals}, Min=${s.minutes_played}, YC=${s.yellow_cards}, RC=${s.red_cards}`);
        });

        const natStats = db.all('SELECT * FROM player_national_stats WHERE player_id = ? ORDER BY season_id DESC LIMIT 3', [playerId]);
        console.log('\n🌍 Checked stats for Player 31 (National):');
        natStats.forEach(s => {
            console.log(`Season ${s.season_id}: Matches=${s.matches}, Goals=${s.goals}, Min=${s.minutes_played}, YC=${s.yellow_cards}, RC=${s.red_cards}`);
        });

    } catch (err) {
        console.error('❌ Sync test failed:', err.response?.data || err.message);
    }
}

testSync();
