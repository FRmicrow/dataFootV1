import db from '../backend/src/config/database.js';

(async () => {
    try {
        await db.init();
        const player = db.get("SELECT player_id, first_name, last_name FROM V2_players LIMIT 1");
        console.log("Player ID:", player ? player.player_id : "None found");
    } catch (e) {
        console.error(e);
    }
})();
