import footballApi from '../services/footballApi.js';
import db from '../config/database.js';
import { getOrCreateCountry, getOrCreateClub, getOrCreateNationalTeam, getOrCreateCompetition } from '../utils/schemaHelpers.js';

/**
 * Import Controller
 * Handles importing player data from API to database with progress tracking
 */

// Store import progress for each player
const importProgress = new Map();

/**
 * Auto-classify league based on name patterns
 * Returns 'championship', 'cup', 'international', or null if unknown
 */
function classifyLeague(leagueName) {
    const name = leagueName.toLowerCase();

    // International Club Competitions
    if (name.includes('champions league') ||
        name.includes('europa league') ||
        name.includes('conference league') ||
        name.includes('uefa super cup') ||
        name.includes('european cup') ||
        name.includes('club world cup') ||
        name.includes('fifa club world cup') ||
        name.includes('libertadores') ||
        name.includes('sudamericana') ||
        name.includes('recopa') ||
        name.includes('intercontinental')) {
        return 'international';
    }

    // National Cups
    if (name.includes('cup') ||
        name.includes('coupe') ||
        name.includes('copa del rey') ||
        name.includes('copa') ||
        name.includes('pokal') ||
        name.includes('taça') ||
        name.includes('coppa') ||
        name.includes('trophée') ||
        name.includes('super cup') ||
        name.includes('supercopa') ||
        name.includes('supercoppa') ||
        name.includes('shield') ||
        name.includes('charity shield') ||
        name.includes('trofeo') ||
        name.includes('trophy')) {
        return 'cup';
    }

    // Championships (Leagues)
    if (name.includes('liga') ||
        name.includes('league') ||
        name.includes('ligue') ||
        name.includes('serie') ||
        name.includes('bundesliga') ||
        name.includes('eredivisie') ||
        name.includes('primeira') ||
        name.includes('premier') ||
        name.includes('championship') ||
        name.includes('division') ||
        name.includes('süper lig') ||
        name.includes('superliga') ||
        name.includes('allsvenskan') ||
        name.includes('eliteserien') ||
        name.includes('pro league') ||
        name.includes('jupiler')) {
        return 'championship';
    }

    // Return null if cannot classify
    return null;
}

/**
 * Get metadata for player import (Seasons preview)
 */
export const getImportMetadata = async (req, res) => {
    const { playerId } = req.params;
    try {
        console.log(`\n🔍 Fetching import metadata for player ID: ${playerId}`);

        // 1. Get profile
        const profileData = await footballApi.getPlayerProfile(playerId);
        if (!profileData.response || profileData.response.length === 0) {
            return res.status(404).json({ error: 'Player not found in API' });
        }
        const profile = profileData.response[0].player;

        // 2. Get seasons
        const seasonsData = await footballApi.getSeasons(playerId);
        const seasons = seasonsData.response || [];

        // 3. Categorize seasons
        // To categorize, we need to fetch stats for EACH season.
        // This is intensive but necessary for the requested preview.
        const clubSeasons = new Set();
        const nationalSeasons = new Set();

        console.log(`🔎 Discovering teams for ${seasons.length} seasons...`);

        // Use Promise.all with the queue-backed API
        await Promise.all(seasons.map(async (season) => {
            try {
                const statsData = await footballApi.getPlayerStatistics(playerId, season);
                if (statsData.response) {
                    for (const playerStat of statsData.response) {
                        if (!playerStat.statistics || !Array.isArray(playerStat.statistics)) continue;

                        for (const stat of playerStat.statistics) {
                            if (!stat.team) continue;

                            const teamName = stat.team.name;
                            const isNational = teamName?.includes('National') ||
                                stat.league?.name?.includes('National') ||
                                stat.league?.name?.includes('World Cup') ||
                                stat.league?.name?.includes('Euro') ||
                                stat.league?.name?.includes('Copa America');

                            if (isNational) {
                                nationalSeasons.add(season);
                            } else {
                                clubSeasons.add(season);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`  ⚠️ Metadata discovery failed for season ${season}:`, err.message);
            }
        }));

        res.json({
            profile: {
                id: profile.id,
                name: `${profile.firstname} ${profile.lastname}`,
                nationality: profile.nationality,
                photo: profile.photo
            },
            clubSeasons: Array.from(clubSeasons).sort((a, b) => b - a),
            nationalSeasons: Array.from(nationalSeasons).sort((a, b) => b - a),
            firstSeason: seasons.length > 0 ? Math.min(...seasons) : null,
            lastSeason: seasons.length > 0 ? Math.max(...seasons) : null
        });

    } catch (error) {
        console.error('❌ Error fetching import metadata:', error.message);
        res.status(500).json({ error: 'Failed to fetch metadata', details: error.message });
    }
};

/**
 * Sync player data (Refresh)
 */
export const syncPlayerData = async (req, res) => {
    const { playerId } = req.params; // This is the local DB ID or API ID? Usually we use API ID for these.

    try {
        const player = db.get('SELECT api_player_id, id FROM players WHERE id = ?', [playerId]);
        if (!player) {
            return res.status(404).json({ error: 'Player not found in local database' });
        }

        const apiPlayerId = player.api_player_id;
        const dbPlayerId = player.id;

        console.log(`\n🔄 Syncing data for player: ${apiPlayerId}`);

        // Re-use import logic but with comparison?
        // Actually, the easiest way to "sync" with SQLite is often DELETE and RE-IMPORT 
        // or UPSERT (INSERT OR REPLACE).
        // Since the user wants to "compare and update", let's do a sequential fetch and check.

        // For simplicity in this rework, we'll treat sync as a thorough update process.
        // We'll reuse the logic from importPlayer but focused on "Refreshing".

        // Let's call the importPlayer logic but maybe with a 'sync' flag?
        // Actually, let's keep it separate for now.

        // For now, let's just trigger the import process again - it uses INSERT OR IGNORE 
        // which won't update existing records if they match the UNIQUE constraints.
        // If we want to support UPDATES, we should use INSERT OR REPLACE or check differences.

        // TO-DO: Implement deep comparison if needed. For now, returning success if import re-runs.
        req.params.playerId = apiPlayerId;
        return importPlayer(req, res);

    } catch (error) {
        console.error('❌ Error syncing player data:', error.message);
        res.status(500).json({ error: 'Sync failed', details: error.message });
    }
};

export const importPlayer = async (req, res) => {
    const { playerId } = req.params;

    try {
        console.log(`\n📥 Starting strict sequential import for player ID: ${playerId}`);

        // Initialize progress tracking
        const progress = {
            playerId,
            status: 'in_progress',
            steps: [],
            errors: []
        };
        importProgress.set(playerId, progress);

        const addStep = (step, status, details = null) => {
            progress.steps.push({ step, status, details, timestamp: new Date() });
        };

        // 1. Fetch and save player profile to local DB
        addStep('fetch_profile', 'running');
        let player = db.get('SELECT id FROM players WHERE api_player_id = ?', [playerId]);

        if (!player) {
            console.log('1️⃣ Fetching player profile (not found in DB)...');
            const profileData = await footballApi.getPlayerProfile(playerId);
            if (!profileData.response || profileData.response.length === 0) {
                addStep('fetch_profile', 'failed', 'Player not found in API');
                progress.status = 'failed';
                return res.status(404).json({ error: 'Player not found' });
            }
            const p = profileData.response[0].player;
            db.run(
                `INSERT OR IGNORE INTO players (api_player_id, first_name, last_name, age, nationality, photo_url)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [p.id, p.firstname, p.lastname, p.age, p.nationality, p.photo]
            );
            player = { id: db.get('SELECT id FROM players WHERE api_player_id = ?', [playerId]).id };
        }

        const dbPlayerId = player.id;
        addStep('fetch_profile', 'success');

        // 2 & 3. Loop from current year down to 2010 and fetch statistics
        addStep('fetch_statistics', 'running');
        const now = new Date();
        const startYear = now.getFullYear();
        console.log(`2️⃣ & 3️⃣ Fetching statistics year by year starting from ${startYear} down to 2010...`);

        let currentYear = startYear;
        let successfulSeasons = 0;
        let emptyYearsInARow = 0;
        const MAX_EMPTY_YEARS = 3;

        while (currentYear >= 2010) {
            try {
                const seasonLabel = String(currentYear);
                const stepId = `fetch_season_${seasonLabel}`;
                addStep(stepId, 'running');

                const statsData = await footballApi.getPlayerStatistics(playerId, currentYear);

                if (statsData.response && statsData.response.length > 0) {
                    await processPlayerStatistics(dbPlayerId, seasonLabel, statsData.response);
                    addStep(stepId, 'success', { records: statsData.response.length });
                    successfulSeasons++;
                    emptyYearsInARow = 0; // Reset counter on success
                } else {
                    addStep(stepId, 'skipped', 'No data returned for season');
                    emptyYearsInARow++;

                    // Stop if we've found enough empty years and we are significantly past the player's prime or current year
                    if (emptyYearsInARow >= MAX_EMPTY_YEARS) {
                        if (successfulSeasons > 0 || currentYear < (startYear - 5)) {
                            console.log(`⏹️ No more data found after year ${currentYear}. Stopping loop.`);
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error(`  ⚠️ Failed year ${currentYear}:`, error.message);
                addStep(`fetch_season_${currentYear}`, 'failed', error.message);
                progress.errors.push({ year: currentYear, error: error.message });
            }
            currentYear--;
        }
        addStep('fetch_statistics', 'success', { successful: successfulSeasons });

        // 4. Fetch and save trophies
        addStep('fetch_trophies', 'running');
        console.log('4️⃣ Fetching trophies...');
        try {
            const trophiesData = await footballApi.getPlayerTrophies(playerId);
            if (trophiesData.response && trophiesData.response.length > 0) {
                await processTrophies(dbPlayerId, trophiesData.response);
                addStep('fetch_trophies', 'success', { count: trophiesData.response.length });
            } else {
                addStep('fetch_trophies', 'skipped', 'No trophies found');
            }
        } catch (error) {
            addStep('fetch_trophies', 'failed', error.message);
            progress.errors.push({ step: 'trophies', error: error.message });
        }

        console.log(`✅ Strict import completed for player ID: ${playerId}\n`);
        progress.status = 'completed';

        res.json({
            success: true,
            playerId: dbPlayerId,
            progress: progress.steps,
            errors: progress.errors
        });

    } catch (error) {
        console.error('❌ Global error in strict import:', error.message);
        if (importProgress.has(playerId)) {
            importProgress.get(playerId).status = 'failed';
            importProgress.get(playerId).errors.push({ step: 'global', error: error.message });
        }
        res.status(500).json({ error: 'Import failed', details: error.message });
    }
};

/**
 * Get import progress for a player
 */
export const getImportProgress = (req, res) => {
    const { playerId } = req.params;
    const progress = importProgress.get(playerId);

    if (!progress) {
        return res.status(404).json({ error: 'No import in progress for this player' });
    }

    res.json(progress);
};

/**
 * Verify and repair database for all players
 * Scans for missing seasons and backfills them
 */
export const verifyDatabase = async (req, res) => {
    try {
        const players = db.all('SELECT id, api_player_id, first_name, last_name FROM players');
        console.log(`\n🔍 Starting Mass Verify for ${players.length} players...`);

        // Initialize global progress
        const verifyStatus = {
            total: players.length,
            current: 0,
            status: 'in_progress',
            details: 'Initializing...',
            errors: []
        };
        importProgress.set('mass_verify', verifyStatus);

        // Run in background but respond immediately or handle via polling
        // To avoid timeout, we process sequentially in a "fire and forget" if needed, 
        // but for now let's just respond with "started".

        const processVerify = async () => {
            for (const player of players) {
                verifyStatus.current++;
                verifyStatus.details = `Verifying ${player.first_name} ${player.last_name} (${verifyStatus.current}/${players.length})`;
                console.log(`  [${verifyStatus.current}/${players.length}] Checking ${player.first_name} ${player.last_name}...`);

                try {
                    // 1. Get API seasons
                    const seasonsData = await footballApi.getSeasons(player.api_player_id);
                    const apiSeasons = seasonsData.response || [];

                    // 2. Get DB seasons
                    const dbSeasonsData = db.all(`
                        SELECT s.label 
                        FROM player_club_stats pcs 
                        JOIN seasons s ON pcs.season_id = s.id 
                        WHERE pcs.player_id = ?
                        UNION
                        SELECT s.label
                        FROM player_national_stats pns
                        JOIN seasons s ON pns.season_id = s.id
                        WHERE pns.player_id = ?
                    `, [player.id, player.id]);
                    const dbSeasons = new Set(dbSeasonsData.map(s => String(s.label)));

                    // 3. Find missing
                    const missingSeasons = apiSeasons.filter(s => !dbSeasons.has(String(s)));

                    if (missingSeasons.length > 0) {
                        console.log(`    ⚠️ Found ${missingSeasons.length} missing seasons: ${missingSeasons.join(', ')}`);
                        for (const season of missingSeasons) {
                            try {
                                const statsData = await footballApi.getPlayerStatistics(player.api_player_id, season);
                                if (statsData.response && statsData.response.length > 0) {
                                    await processPlayerStatistics(player.id, String(season), statsData.response);
                                }
                            } catch (statError) {
                                console.error(`    ❌ Failed season ${season} for ${player.last_name}:`, statError.message);
                            }
                        }
                    }
                } catch (playerError) {
                    console.error(`  ❌ Error verifying player ${player.last_name}:`, playerError.message);
                    verifyStatus.errors.push({ player: player.last_name, error: playerError.message });
                }
            }
            verifyStatus.status = 'completed';
            verifyStatus.details = 'Verification complete';
            console.log('✅ Mass Verify completed.');
        };

        processVerify(); // Run in background

        res.json({
            success: true,
            message: 'Mass verify started in background',
            total: players.length
        });

    } catch (error) {
        console.error('❌ Mass Verify failed to start:', error.message);
        res.status(500).json({ error: 'Failed to start mass verify', details: error.message });
    }
};

/**
 * Get status of mass verify
 or other background tasks
 */
export const getMassVerifyStatus = (req, res) => {
    const status = importProgress.get('mass_verify');
    if (!status) return res.status(404).json({ error: 'No mass verify in progress' });
    res.json(status);
};

/**
 * Retry failed or skipped steps for a player import
 */
export const retryFailedImport = async (req, res) => {
    const { playerId } = req.params;

    try {
        const existingPlayer = db.get('SELECT id FROM players WHERE api_player_id = ?', [playerId]);

        if (!existingPlayer) {
            return res.status(404).json({ error: 'Player not found in database.' });
        }

        const dbPlayerId = existingPlayer.id;
        const previousProgress = importProgress.get(playerId) || { steps: [], errors: [] };

        const progress = {
            playerId,
            status: 'retrying',
            steps: [],
            errors: []
        };
        importProgress.set(playerId, progress);

        const addStep = (step, status, details = null) => {
            progress.steps.push({ step, status, details, timestamp: new Date() });
        };

        console.log(`\n🔄 Retrying failed imports for player ID: ${playerId}`);

        // Get seasons (specific to player)
        addStep('fetch_seasons', 'running');
        const seasonsData = await footballApi.getSeasons(playerId);
        const seasons = seasonsData.response || [];
        addStep('fetch_seasons', 'success', { count: seasons.length });

        let successfulRetries = 0;
        let failedRetries = 0;

        for (const season of seasons) {
            const seasonStep = `fetch_season_${season}`;
            const previousStep = previousProgress.steps?.find(s => s.step === seasonStep);

            if (!previousStep || previousStep.status === 'failed' || previousStep.status === 'skipped') {
                try {
                    addStep(seasonStep, 'running');
                    const statsData = await footballApi.getPlayerStatistics(playerId, season);

                    if (statsData.response && statsData.response.length > 0) {
                        await processPlayerStatistics(dbPlayerId, season, statsData.response);
                        addStep(seasonStep, 'success', { records: statsData.response.length });
                        successfulRetries++;
                    } else {
                        addStep(seasonStep, 'skipped', 'No data');
                    }
                } catch (error) {
                    addStep(seasonStep, 'failed', error.message);
                    failedRetries++;
                    progress.errors.push({ season, error: error.message });
                }
            } else {
                addStep(seasonStep, 'skipped', 'Already completed');
            }
        }

        const trophiesStep = previousProgress.steps?.find(s => s.step === 'fetch_trophies');
        if (!trophiesStep || trophiesStep.status === 'failed' || trophiesStep.status === 'skipped') {
            addStep('fetch_trophies', 'running');
            try {
                const trophiesData = await footballApi.getPlayerTrophies(playerId);
                if (trophiesData.response && trophiesData.response.length > 0) {
                    await processTrophies(dbPlayerId, trophiesData.response);
                    addStep('fetch_trophies', 'success', { count: trophiesData.response.length });
                    successfulRetries++;
                } else {
                    addStep('fetch_trophies', 'skipped', 'No trophies found');
                }
            } catch (error) {
                addStep('fetch_trophies', 'failed', error.message);
                failedRetries++;
                progress.errors.push({ step: 'trophies', error: error.message });
            }
        }

        progress.status = failedRetries > 0 ? 'completed_with_errors' : 'completed';
        res.json({ success: true, playerId: dbPlayerId, progress: progress.steps, errors: progress.errors });

    } catch (error) {
        console.error('❌ Error retrying import:', error.message);
        res.status(500).json({ error: 'Failed to retry import', details: error.message });
    }
};

/**
 * Process player statistics and store in database
 */
async function processPlayerStatistics(playerId, seasonLabel, statistics) {
    seasonLabel = String(seasonLabel);
    console.log(`  📊 Processing statistics for season ${seasonLabel}...`);

    // Get or create season
    let season = db.get('SELECT id FROM seasons WHERE label = ?', [seasonLabel]);
    if (!season) {
        const year = parseInt(seasonLabel.split('/')[0]) || parseInt(seasonLabel);
        const result = db.run('INSERT INTO seasons (label, year) VALUES (?, ?)', [seasonLabel, year]);
        season = { id: result.lastInsertRowid };
    }

    for (const playerStat of statistics) {
        if (!playerStat.statistics || !Array.isArray(playerStat.statistics)) continue;

        for (const stat of playerStat.statistics) {
            const teamData = stat.team;
            const leagueData = stat.league;
            const games = stat.games;
            const goals = stat.goals;
            const passes = stat.passes;

            if (!teamData) continue;

            // Determine if it's a national team
            const isNationalTeam = teamData.national === true ||
                teamData.name?.includes('National') ||
                leagueData?.name?.includes('World Cup') ||
                leagueData?.name?.includes('Euro') ||
                leagueData?.name?.includes('Copa America') ||
                leagueData?.name?.includes('Friendlies') ||
                leagueData?.name?.includes('Qualifiers') ||
                leagueData?.name?.includes('Nations League');

            if (isNationalTeam) {
                // === NATIONAL TEAM ===
                const nationalTeamId = teamData.id || -(Math.abs(hashString(teamData.name)));
                const nationalTeam = getOrCreateNationalTeam(nationalTeamId, teamData.name, teamData.name);

                if (!nationalTeam) {
                    console.warn(`    ⚠️  Could not create national team: ${teamData.name}`);
                    continue;
                }

                const apiLeagueId = leagueData.id || -(Math.abs(hashString(leagueData.name)));
                const competition = getOrCreateCompetition(apiLeagueId, leagueData.name, leagueData.country);

                if (!competition || competition.table !== 'national_team_cups') {
                    console.warn(`    ⚠️  Skipping non-national-team competition: ${leagueData.name}`);
                    continue;
                }

                console.log(`    ✓ ${teamData.name} - ${leagueData.name}`);

                db.run(
                    `INSERT OR REPLACE INTO player_national_stats 
                    (player_id, national_team_id, competition_id, season_id, matches, goals, assists)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [playerId, nationalTeam.id, competition.id, season.id,
                        games?.appearences || 0, goals?.total || 0, passes?.assists || 0]
                );
            } else {
                // === CLUB TEAM ===
                if (!teamData.id) {
                    console.warn(`    ⚠️  Skipping team without ID: ${teamData.name}`);
                    continue;
                }

                const club = getOrCreateClub(teamData.id, teamData.name, teamData.logo, leagueData?.country);
                if (!club) {
                    console.warn(`    ⚠️  Could not create club: ${teamData.name}`);
                    continue;
                }

                const apiLeagueId = leagueData.id || -(Math.abs(hashString(leagueData.name)));
                const competition = getOrCreateCompetition(apiLeagueId, leagueData.name, leagueData.country);

                if (!competition) {
                    console.warn(`    ⚠️  Could not create competition: ${leagueData.name}`);
                    continue;
                }

                // Map competition table to type
                let competitionType;
                if (competition.table === 'championships') competitionType = 'championship';
                else if (competition.table === 'national_cups') competitionType = 'cup';
                else if (competition.table === 'international_cups') competitionType = 'international_cup';
                else {
                    console.warn(`    ⚠️  Unexpected competition table: ${competition.table} for ${leagueData.name}`);
                    continue;
                }

                console.log(`    ✓ ${teamData.name} - ${leagueData.name} (${competitionType})`);

                db.run(
                    `INSERT OR REPLACE INTO player_club_stats 
                    (player_id, club_id, competition_id, competition_type, season_id, matches, goals, assists)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [playerId, club.id, competition.id, competitionType, season.id,
                        games?.appearences || 0, goals?.total || 0, passes?.assists || 0]
                );
            }
        }
    }
}


/**
 * Process trophies and store in database
 */



/**
 * Process trophies and store in database
 */
async function processTrophies(playerId, trophies) {
    console.log(`  🏆 Processing ${trophies.length} trophies...`);

    for (const trophyData of trophies) {
        // Get or create trophy
        let trophy = db.get('SELECT id FROM trophies WHERE name = ?', [trophyData.league]);

        if (!trophy) {
            const result = db.run('INSERT INTO trophies (name, type) VALUES (?, ?)', [trophyData.league, trophyData.country]);
            trophy = { id: result.lastInsertRowid };
        }

        // Get or create season - convert to string in case it's a number
        const seasonLabel = String(trophyData.season);
        let season = db.get('SELECT id FROM seasons WHERE label = ?', [seasonLabel]);

        if (!season) {
            // Handle both "2023/2024" and "2023" formats
            const yearMatch = seasonLabel.match(/\d{4}/);
            const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
            const result = db.run('INSERT INTO seasons (label, year) VALUES (?, ?)', [seasonLabel, year]);
            season = { id: result.lastInsertRowid };
        }

        // Insert trophy (team can be null for some trophies)
        // Use IGNORE to avoid duplicates during sync
        db.run(
            `INSERT OR IGNORE INTO player_trophies (player_id, team_id, season_id, trophy_id)
       VALUES (?, ?, ?, ?)`,
            [playerId, null, season.id, trophy.id]
        );
    }
}
export const importTeam = async (req, res) => {
    const { teamId } = req.params;

    if (!teamId) {
        return res.status(400).json({ error: 'Team ID is required' });
    }

    const progress = {
        status: 'importing',
        steps: [],
        errors: []
    };

    const addStep = (id, status, details = null) => {
        const step = { id, status, timestamp: new Date().toISOString() };
        if (details) step.details = details;
        progress.steps.push(step);
    };

    try {
        console.log(`🚀 Starting direct import for team ID: ${teamId}`);

        // 1. Fetch and save team profile
        addStep('fetch_profile', 'running');
        let team = db.get('SELECT id, name FROM teams WHERE api_team_id = ?', [teamId]);

        if (!team) {
            console.log('1️⃣ Fetching team profile...');
            const teamData = await footballApi.searchTeams(teamId); // Can also use team=id if needed, but searchTeams works with ID as numeric
            if (!teamData.response || teamData.response.length === 0) {
                addStep('fetch_profile', 'failed', 'Team not found in API');
                return res.status(404).json({ error: 'Team not found' });
            }
            const t = teamData.response[0].team;
            db.run(
                'INSERT OR IGNORE INTO teams (api_team_id, name, logo_url) VALUES (?, ?, ?)',
                [t.id, t.name, t.logo]
            );
            team = { id: db.get('SELECT id FROM teams WHERE api_team_id = ?', [teamId]).id, name: t.name };
        }
        addStep('fetch_profile', 'success');

        const dbTeamId = team.id;

        // 2. Fetch seasons
        addStep('fetch_seasons', 'running');
        console.log('2️⃣ Fetching team seasons...');
        const seasonsData = await footballApi.getTeamSeasons(teamId);
        const seasons = seasonsData.response || [];

        for (const s of seasons) {
            const label = String(s);
            const year = parseInt(label.split('/')[0]) || parseInt(label);
            db.run('INSERT OR IGNORE INTO seasons (label, year) VALUES (?, ?)', [label, year]);
        }
        addStep('fetch_seasons', 'success', { count: seasons.length });

        // 3. Fetch standings and stats per season
        addStep('fetch_standings', 'running', { total: seasons.length });
        console.log(`3️⃣ Fetching standings for ${seasons.length} seasons...`);
        for (const season of seasons) {
            try {
                const stepId = `fetch_team_data_${season}`;
                addStep(stepId, 'running');

                // Get standings
                const standingsData = await footballApi.getTeamStandings(teamId, season);
                if (standingsData.response && standingsData.response.length > 0) {
                    await processTeamStandings(dbTeamId, season, standingsData.response);
                }

                // Also fetch detailed stats for the leagues found in standings
                if (standingsData.response && standingsData.response.length > 0) {
                    for (const leagueEntry of standingsData.response) {
                        const league = leagueEntry.league;
                        if (league && league.id) {
                            const statsData = await footballApi.getTeamStatistics(teamId, league.id, season);
                            if (statsData.response) {
                                await processClubDetailedStatistics(dbTeamId, league.id, season, statsData.response);
                            }
                        }
                    }
                }

                addStep(stepId, 'success');
            } catch (error) {
                console.error(`  ⚠️ Failed season ${season} for team:`, error.message);
                addStep(`fetch_team_data_${season}`, 'failed', error.message);
            }
        }
        addStep('fetch_standings', 'success');

        // 4. Fetch trophies
        addStep('fetch_trophies', 'running');
        console.log('4️⃣ Fetching team trophies...');
        try {
            const trophiesData = await footballApi.getTeamTrophies(teamId);
            if (trophiesData.response && trophiesData.response.length > 0) {
                await processTeamTrophies(dbTeamId, trophiesData.response);
                addStep('fetch_trophies', 'success', { count: trophiesData.response.length });
            } else {
                addStep('fetch_trophies', 'skipped');
            }
        } catch (error) {
            addStep('fetch_trophies', 'failed', error.message);
        }

        progress.status = 'completed';
        res.json({
            success: true,
            teamId: dbTeamId,
            progress: progress.steps,
            errors: progress.errors
        });

    } catch (error) {
        console.error('❌ Global error in team import:', error.message);
        res.status(500).json({ error: 'Team import failed', details: error.message });
    }
};

async function processTeamStandings(teamId, seasonLabel, response) {
    const season = db.get('SELECT id FROM seasons WHERE label = ?', [seasonLabel]);
    if (!season) return;

    for (const entry of response) {
        const leagueData = entry.league;
        if (!leagueData || !leagueData.standings) continue;

        // Create league if not exists
        let league = db.get('SELECT id FROM leagues WHERE api_league_id = ?', [leagueData.id]);
        if (!league) {
            const result = db.run(
                'INSERT INTO leagues (api_league_id, name, country) VALUES (?, ?, ?)',
                [leagueData.id, leagueData.name, leagueData.country]
            );
            league = { id: result.lastInsertRowid };
        }

        // Flatten standings (can be nested arrays for groups/stages)
        const standings = leagueData.standings.flat();
        const teamStanding = standings.find(s => s.team && s.team.id == db.get('SELECT api_team_id FROM teams WHERE id = ?', [teamId]).api_team_id);

        if (teamStanding) {
            db.run(
                `INSERT OR REPLACE INTO standings 
                (team_id, league_id, season_id, rank, points, goals_diff, form, status, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    teamId,
                    league.id,
                    season.id,
                    teamStanding.rank,
                    teamStanding.points,
                    teamStanding.goalsDiff,
                    teamStanding.form,
                    teamStanding.status,
                    teamStanding.description
                ]
            );
        }
    }
}

async function processClubDetailedStatistics(teamId, apiLeagueId, seasonLabel, stats) {
    const season = db.get('SELECT id FROM seasons WHERE label = ?', [seasonLabel]);
    const league = db.get('SELECT id FROM leagues WHERE api_league_id = ?', [apiLeagueId]);
    if (!season || !league) return;

    const fixtures = stats.fixtures;
    const goals = stats.goals;

    if (!fixtures) return;

    db.run(
        `INSERT OR REPLACE INTO team_statistics 
        (team_id, league_id, season_id, played, wins, draws, losses, goals_for, goals_against, 
         clean_sheets, failed_to_score, avg_goals_for, avg_goals_against)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            teamId,
            league.id,
            season.id,
            fixtures.played?.total || 0,
            fixtures.wins?.total || 0,
            fixtures.draws?.total || 0,
            fixtures.loses?.total || 0,
            goals.for?.total?.total || 0,
            goals.against?.total?.total || 0,
            stats.clean_sheet?.total || 0,
            stats.failed_to_score?.total || 0,
            goals.for?.average?.total || 0,
            goals.against?.average?.total || 0
        ]
    );
}

async function processTeamTrophies(teamId, trophies) {
    for (const trophyData of trophies) {
        // Find or create trophy
        let trophy = db.get('SELECT id FROM trophies WHERE name = ?', [trophyData.league]);
        if (!trophy) {
            const result = db.run('INSERT INTO trophies (name, type) VALUES (?, ?)', [trophyData.league, 'League/Cup']);
            trophy = { id: result.lastInsertRowid };
        }

        // Find or create season
        let season = db.get('SELECT id FROM seasons WHERE label = ?', [trophyData.season]);
        if (!season) {
            const year = parseInt(trophyData.season.split('/')[0]) || parseInt(trophyData.season);
            const result = db.run('INSERT INTO seasons (label, year) VALUES (?, ?)', [trophyData.season, year]);
            season = { id: result.lastInsertRowid };
        }

        db.run(
            `INSERT OR IGNORE INTO team_trophies (team_id, trophy_id, season_id, place)
            VALUES (?, ?, ?, ?)`,
            [teamId, trophy.id, season.id, trophyData.place]
        );
    }
}

/**
 * Get list of leagues that don't have a classification yet
 */
export const getUnclassifiedLeagues = (req, res) => {
    try {
        const unclassified = db.all(`
            SELECT l.id, l.name, l.country, l.api_league_id
            FROM leagues l
            LEFT JOIN league_classifications lc ON l.id = lc.league_id
            WHERE lc.league_id IS NULL
            ORDER BY l.name
        `);

        res.json({ leagues: unclassified });
    } catch (error) {
        console.error('❌ Error fetching unclassified leagues:', error.message);
        res.status(500).json({ error: 'Failed to fetch unclassified leagues' });
    }
};

/**
 * Manually classify a league
 */
export const classifyLeagueManually = (req, res) => {
    const { leagueId } = req.params;
    const { competitionType } = req.body;

    // Validate competition type
    if (!['championship', 'cup', 'international'].includes(competitionType)) {
        return res.status(400).json({
            error: 'Invalid competition type',
            validTypes: ['championship', 'cup', 'international']
        });
    }

    try {
        // Check if league exists
        const league = db.get('SELECT id, name FROM leagues WHERE id = ?', [leagueId]);

        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }

        // Insert or update classification
        db.run(
            'INSERT OR REPLACE INTO league_classifications (league_id, competition_type) VALUES (?, ?)',
            [leagueId, competitionType]
        );

        console.log(`✓ Manually classified "${league.name}" as "${competitionType}"`);

        res.json({
            success: true,
            league: league.name,
            competitionType
        });

    } catch (error) {
        console.error('❌ Error classifying league:', error.message);
        res.status(500).json({ error: 'Failed to classify league' });
    }
};

// Helper function for string hashing
function hashString(str) {
    let hash = 0;
    if (!str) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash | 0; // Convert to 32bit integer
    }
    return hash;
}

/**
 * BATCH IMPORT FUNCTIONALITY
 * Multi-threaded import with retry logic
 */

// Store batch import progress
const batchProgress = new Map();

/**
 * Import multiple players concurrently with batching
 * POST /api/import/batch
 */
export const importBatch = async (req, res) => {
    const { playerIds, batchSize = 5 } = req.body;
    
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
        return res.status(400).json({ error: 'playerIds array is required' });
    }
    
    const batchId = `batch-${Date.now()}`;
    const progress = {
        batchId,
        total: playerIds.length,
        completed: 0,
        failed: 0,
        results: [],
        startTime: new Date(),
        status: 'running'
    };
    
    batchProgress.set(batchId, progress);
    
    res.json({
        success: true,
        batchId,
        message: `Batch import started for ${playerIds.length} players`
    });
    
    // Process in background
    processBatchImport(batchId, playerIds, batchSize).catch(error => {
        console.error('Batch error:', error);
        progress.status = 'failed';
    });
};

/**
 * Get batch progress
 */
export const getBatchProgress = (req, res) => {
    const { batchId } = req.params;
    const progress = batchProgress.get(batchId);
    
    if (!progress) {
        return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json(progress);
};

async function processBatchImport(batchId, playerIds, batchSize) {
    const progress = batchProgress.get(batchId);
    const batches = [];
    
    for (let i = 0; i < playerIds.length; i += batchSize) {
        batches.push(playerIds.slice(i, i + batchSize));
    }
    
    console.log(`🚀 Batch import: ${batches.length} batches`);
    
    for (const batch of batches) {
        const results = await Promise.allSettled(
            batch.map(id => importPlayerQuick(id))
        );
        
        results.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
                progress.completed++;
                progress.results.push({ playerId: batch[idx], status: 'success' });
            } else {
                progress.failed++;
                progress.results.push({ playerId: batch[idx], status: 'failed', error: result.reason?.message });
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    progress.status = 'completed';
    progress.endTime = new Date();
}

async function importPlayerQuick(playerId) {
    let player = db.get('SELECT id FROM players WHERE api_player_id = ?', [playerId]);
    
    if (!player) {
        const profileData = await footballApi.getPlayerProfile(playerId);
        if (!profileData.response?.[0]) throw new Error('Not found');
        
        const p = profileData.response[0].player;
        db.run(
            `INSERT OR IGNORE INTO players (api_player_id, first_name, last_name, age, nationality, photo_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [p.id, p.firstname, p.lastname, p.age, p.nationality, p.photo]
        );
        player = { id: db.get('SELECT id FROM players WHERE api_player_id = ?', [playerId]).id };
    }
    
    const dbPlayerId = player.id;
    const currentYear = new Date().getFullYear();
    
    // Only fetch last 2 years for speed
    for (let year = currentYear; year >= currentYear - 2; year--) {
        try {
            const statsData = await footballApi.getPlayerStatistics(playerId, year);
            if (statsData.response?.length > 0) {
                await processPlayerStatistics(dbPlayerId, String(year), statsData.response);
            }
        } catch (e) {
            console.error(`Year ${year} failed for ${playerId}`);
        }
    }
    
    return dbPlayerId;
}
