import db from '../../config/database.js';

export const getPreferencesService = async () => {
    let row = db.get("SELECT favorite_leagues, favorite_teams, tracked_leagues FROM V3_System_Preferences WHERE id = 1");
    if (!row) {
        db.run("INSERT INTO V3_System_Preferences (id, favorite_leagues, favorite_teams, tracked_leagues) VALUES (1, '[]', '[]', '[]')");
        row = { favorite_leagues: '[]', favorite_teams: '[]', tracked_leagues: '[]' };
    }
    return {
        favorite_leagues: JSON.parse(row.favorite_leagues || '[]'),
        favorite_teams: JSON.parse(row.favorite_teams || '[]'),
        tracked_leagues: JSON.parse(row.tracked_leagues || '[]')
    };
};

export const updatePreferencesService = async (leagues, teams, trackedLeagues) => {
    const lStr = JSON.stringify(leagues || []);
    const tStr = JSON.stringify(teams || []);
    const trStr = JSON.stringify(trackedLeagues || []);

    const sql = `
        INSERT INTO V3_System_Preferences (id, favorite_leagues, favorite_teams, tracked_leagues) 
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
            favorite_leagues = excluded.favorite_leagues,
            favorite_teams = excluded.favorite_teams,
            tracked_leagues = excluded.tracked_leagues
    `;

    db.run(sql, [lStr, tStr, trStr]);
    return getPreferencesService();
};

