
import axios from 'axios';
import db from '../../config/database.js';
import logger from '../../utils/logger.js';
import ResolutionServiceV4 from './ResolutionServiceV4.js';

class TransfermarktScraperService {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.errorCount = 0;
        this.MAX_ERRORS = 1; 
    }

    normalize(str) {
        if (!str) return '';
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, '')
            .trim();
    }

    isTeamMatch(tmName, dbName, relaxed = false) {
        const nTm = this.normalize(tmName);
        const nDb = this.normalize(dbName);
        if (nTm.includes(nDb) || nDb.includes(nTm)) return true;
        
        const minWordLen = relaxed ? 3 : 4;
        const tmWords = nTm.split(/\s+/).filter(w => w.length >= minWordLen);
        const dbWords = nDb.split(/\s+/).filter(w => w.length >= minWordLen);
        
        for (const word of tmWords) {
            if (dbWords.includes(word)) return true;
        }

        // Even more relaxed for top leagues: check if any DB word is part of a TM word
        if (relaxed) {
            for (const dbWord of dbWords) {
                for (const tmWord of tmWords) {
                    if (tmWord.includes(dbWord) || dbWord.includes(tmWord)) return true;
                }
            }
        }

        return false;
    }

    async resolvePerson(name, tmId, type = 'player') {
        if (!name || !tmId) return null;
        try {
            return await ResolutionServiceV4.resolvePerson(`transfermarkt_${type}`, tmId, { name, personType: type });
        } catch (err) {
            logger.error({ err, tmId, name }, 'Failed to resolve person in TM scraper');
            return null;
        }
    }

    async resolveVenue(name, url) {
        if (!name) return null;
        try {
            // Using URL as source_id for venues in Transfermarkt
            return await ResolutionServiceV4.resolveVenue('transfermarkt', url || name, { name });
        } catch (err) {
            logger.error({ err, name, url }, 'Failed to resolve venue in TM scraper');
            return null;
        }
    }

    async fetchMatchDetails(sourceMatchId, dbData, relaxed = false) {
        if (this.errorCount >= this.MAX_ERRORS) throw new Error('Circuit breaker triggered');
        
        const cleanId = sourceMatchId.replace('source-', '');
        const url = `https://www.transfermarkt.com/spielbericht/index/spielbericht/${cleanId}`;
        
        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 10000
            });
            this.errorCount = 0; 
            const html = response.data;
            
            const dateMatch = html.match(/\/datum\/(\d{4}-\d{2}-\d{2})/);
            const tmDate = dateMatch ? dateMatch[1] : null;
            const homeMatch = html.match(/class="sb-team sb-heim"[\s\S]*?title="([^"]+)"/);
            const awayMatch = html.match(/class="sb-team sb-gast"[\s\S]*?title="([^"]+)"/);
            const tmHome = homeMatch ? homeMatch[1] : null;
            const tmAway = awayMatch ? awayMatch[1] : null;
            const scoreMatch = html.match(/class="sb-endstand">[\s\S]*?(\d+):(\d+)/);
            const tmScore = scoreMatch ? `${scoreMatch[1]}-${scoreMatch[2]}` : null;

            if (!tmDate || !tmHome || !tmAway || !tmScore) return null;

            // Verification with RELAXED mode support
            const homeMatches = this.isTeamMatch(tmHome, dbData.home_name, relaxed);
            const awayMatches = this.isTeamMatch(tmAway, dbData.away_name, relaxed);
            const scoreMatches = tmScore === `${dbData.home_score}-${dbData.away_score}`;

            if (!homeMatches || !awayMatches || !scoreMatches) {
                if (relaxed) {
                    logger.debug({ tmHome, dbHome: dbData.home_name, tmAway, dbAway: dbData.away_name }, '❌ Relaxed Verification Failed');
                }
                return null;
            }

            const attendanceMatch = html.match(/Attendance:.*?([\d.]+)/);
            const attendance = attendanceMatch ? parseInt(attendanceMatch[1].replace(/\./g, '')) : null;
            const stadiumLink = html.match(/<a href="([^"]*?\/stadion\/[^"]*?)">([^<]+)<\/a>/);
            const venueName = stadiumLink ? stadiumLink[2].trim() : null;
            const venueUrl = stadiumLink ? `https://www.transfermarkt.com${stadiumLink[1]}` : null;
            const refereeMatch = html.match(/Referee:.*?<a href="([^"]*?\/schiedsrichter\/[^"]*?)">([^<]+)<\/a>/);
            const refereeName = refereeMatch ? refereeMatch[2].trim() : null;
            const refereeTmId = refereeMatch ? refereeMatch[1].match(/\/(\d+)$/)?.[1] : null;

            const formationRegex = /Starting Line-up:\s*(.*?)(?=<|$)/g;
            const formations = [];
            let fMatch;
            while ((fMatch = formationRegex.exec(html)) !== null) {
                formations.push(fMatch[1].trim());
            }

            return {
                date: tmDate,
                attendance,
                venue: { name: venueName, url: venueUrl },
                referee: { name: refereeName, tmId: refereeTmId },
                home_formation: formations[0] || null,
                away_formation: formations[1] || null
            };
        } catch (error) {
            if (error.response && error.response.status >= 400) {
                this.errorCount++;
                logger.error({ status: error.response.status, cleanId, error: error.message }, '🛑 FATAL ERROR');
            }
            return { error: true, status: error.response?.status };
        }
    }

    async fetchPlayerProfile(sourceTmId, type = 'player') {
        if (this.errorCount >= this.MAX_ERRORS) throw new Error('Circuit breaker triggered');
        
        const url = type === 'coach' 
            ? `https://www.transfermarkt.com/trainer/profil/trainer/${sourceTmId}`
            : `https://www.transfermarkt.com/player/profil/spieler/${sourceTmId}`;
        
        try {
            const response = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 10000
            });
            this.errorCount = 0;
            const html = response.data;


            const extract = (label) => {
                // Primary: Look for span-based info-table structure
                const regex = new RegExp(`${label}\\s*[:]?\\s*<\\/span>\\s*<span[^>]*>([\\s\\S]*?)<\\/span>`, 'i');
                const m = html.match(regex);
                if (m) return m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().split('\n')[0].trim();
                
                // Secondary: More permissive match for any tag follow-up
                const regex2 = new RegExp(`${label}\\s*[:]?\\s*<[^>]+>\\s*([^<\n]+)`, 'i');
                const m2 = html.match(regex2);
                if (m2) return m2[1].replace(/&nbsp;/g, ' ').trim();

                return null;
            };

            const birthDateRaw = extract('Date of birth/Age') || extract('Date of birth');
            const birthPlace = extract('Place of birth');
            const height = extract('Height');
            const foot = extract('Foot');
            const position = extract('Position');
            const originalName = extract('Full name') || extract('Original name');

            const citizenship = extract('Citizenship');

            const birthCountryMatch = html.match(/Place of birth:<\/span>[\s\S]*?<img.*?title="([^"]+)"/i);
            const photoMatch = html.match(/<div class="data-header__profile-container">[\s\S]*?<img src="([^"]+)"/i);

            // Nationalities
            const natRegex = /(?:Nationality|Citizenship):<\/span>[\s\S]*?info-table__content[^>]*>([\s\S]*?)<\/span>/i;
            const natBlock = html.match(natRegex);
            const nationalities = [];
            if (natBlock) {
                const titleRegex = /title="([^"]+)"/g;
                let tMatch;
                while ((tMatch = titleRegex.exec(natBlock[1])) !== null) {
                    nationalities.push(tMatch[1]);
                }
            }

            return {
                birth_date: birthDateRaw ? birthDateRaw.split('(')[0].trim() : null,
                birth_place: birthPlace,
                birth_country: birthCountryMatch ? birthCountryMatch[1].trim() : null,
                height: height,
                preferred_foot: foot,
                main_position: position,
                original_name: originalName,
                photo_url: photoMatch ? photoMatch[1] : null,
                nationalities: nationalities.slice(0, 4)
            };
        } catch (error) {
            if (error.response && error.response.status >= 400) {
                this.errorCount++;
                logger.error({ status: error.response.status, sourceTmId, error: error.message }, '🛑 FATAL ERROR ON PLAYER PROFILE');
            }
            return null;
        }
    }

    async recoverMissingDates(competitionId = null, limit = 100, concurrency = 10) {
        logger.info({ competitionId, limit, concurrency }, '🚀 Starting RELAXED Top-Ranked recovery...');
        this.errorCount = 0;
        
        let query = `
            SELECT m.match_id, m.source_match_id, m.home_score, m.away_score, 
                   m.home_team_id, m.away_team_id,
                   h.name as home_name, a.name as away_name,
                   c.importance_rank as comp_rank
            FROM v4.matches m
            JOIN v4.teams h ON m.home_team_id = h.team_id
            JOIN v4.teams a ON m.away_team_id = a.team_id
            JOIN v4.competitions c ON m.competition_id = c.competition_id
            WHERE (m.match_date IS NULL OR m.venue_id IS NULL OR m.referee_person_id IS NULL OR m.home_formation IS NULL)
              AND m.source_match_id IS NOT NULL 
              AND SUBSTRING(m.season_label, 1, 4)::INTEGER >= 1989
              AND c.importance_rank BETWEEN 1 AND 20
        `;
        const params = [];
        if (competitionId) {
            query += ` AND m.competition_id = $1 `;
            params.push(competitionId);
        }
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);

        const matches = await db.all(query, params);
        logger.info(`Found ${matches.length} matches in Top 20 leagues to repair with relaxed rules.`);

        for (let i = 0; i < matches.length; i += concurrency) {
            const batch = matches.slice(i, i + concurrency);
            await Promise.all(batch.map(async (match) => {
                // All these matches get relaxed verification (rank 1-20)
                const details = await this.fetchMatchDetails(match.source_match_id, match, true);
                if (details && details.date) {
                    const venueId = details.venue.name ? await this.resolveVenue(details.venue.name, details.venue.url) : null;
                    const refereeId = details.referee.tmId ? await this.resolvePerson(details.referee.name, details.referee.tmId, 'referee') : null;

                    await db.run(`
                        UPDATE v4.matches 
                        SET match_date = $1, attendance = $2, venue_id = $3, referee_person_id = $4,
                            home_formation = $5, away_formation = $6
                        WHERE match_id = $7
                    `, [details.date, details.attendance, venueId, refereeId, details.home_formation, details.away_formation, match.match_id]);

                    logger.info({ match_id: match.match_id, date: details.date }, '✅ Enriched (Relaxed)');
                }
            }));
            if (this.errorCount >= this.MAX_ERRORS) break;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return { total: matches.length };
    }
}

export default new TransfermarktScraperService();
