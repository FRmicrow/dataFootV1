import logger from '../../utils/logger.js';

export const up = async (db) => {
    // Rename "Coupe du monde 1998" → "Coupe du monde"
    // Ce nom trompeur couvre en réalité TOUTES les Coupes du monde 1930→1998 (538 matchs)
    const cdm = await db.get(
        `SELECT competition_id FROM v4.competitions WHERE name = 'Coupe du monde 1998'`
    );
    if (cdm) {
        await db.run(
            `UPDATE v4.competitions SET name = 'Coupe du monde' WHERE competition_id = ?`,
            [cdm.competition_id]
        );
        logger.info({ competition_id: cdm.competition_id }, 'Renamed: "Coupe du monde 1998" → "Coupe du monde"');
    } else {
        logger.info({}, '"Coupe du monde 1998" not found — already renamed or absent');
    }

    // Rename "Championnat d'Europe 2020" → "Championnat d'Europe"
    // Couvre toutes les éditions 1960→2020 (337 matchs)
    const euro = await db.get(
        `SELECT competition_id FROM v4.competitions WHERE name = 'Championnat d''Europe 2020'`
    );
    if (euro) {
        await db.run(
            `UPDATE v4.competitions SET name = 'Championnat d''Europe' WHERE competition_id = ?`,
            [euro.competition_id]
        );
        logger.info({ competition_id: euro.competition_id }, 'Renamed: "Championnat d\'Europe 2020" → "Championnat d\'Europe"');
    } else {
        logger.info({}, '"Championnat d\'Europe 2020" not found — already renamed or absent');
    }
};

export const down = async (db) => {
    await db.run(`UPDATE v4.competitions SET name = 'Coupe du monde 1998' WHERE name = 'Coupe du monde'`);
    await db.run(`UPDATE v4.competitions SET name = 'Championnat d''Europe 2020' WHERE name = 'Championnat d''Europe'`);
};
