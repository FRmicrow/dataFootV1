import 'dotenv/config';

import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const COUNTRY_RANKINGS = [
    ['Angleterre', 1, 'elite'],
    ['Espagne', 2, 'elite'],
    ['Allemagne', 3, 'elite'],
    ['Italie', 4, 'elite'],
    ['France', 5, 'elite'],
    ['Portugal', 6, 'major'],
    ['PaysBas', 7, 'major'],
    ['Belgique', 8, 'major'],
    ['Turquie', 9, 'major'],
    ['Ecosse', 10, 'major'],
    ['Bresil', 11, 'major'],
    ['Argentine', 12, 'major'],
    ['USA', 13, 'major'],
    ['Mexique', 14, 'major'],
    ['ArabieSaoudite', 15, 'major'],
    ['Japon', 16, 'major'],
    ['Suisse', 17, 'strong'],
    ['Autriche', 18, 'strong'],
    ['Danemark', 19, 'strong'],
    ['Croatie', 20, 'strong'],
    ['RepubliqueTcheque', 21, 'strong'],
    ['Pologne', 22, 'strong'],
    ['Ukraine', 23, 'strong'],
    ['Grece', 24, 'strong'],
    ['Russie', 25, 'strong'],
    ['Serbie', 26, 'strong'],
    ['Norvege', 27, 'strong'],
    ['Suede', 28, 'strong'],
    ['Colombie', 29, 'strong'],
    ['Uruguay', 30, 'strong'],
    ['Chili', 31, 'strong'],
    ['Equateur', 32, 'strong'],
    ['Paraguay', 33, 'strong'],
    ['CoreeDuSud', 34, 'strong'],
    ['Australie', 35, 'strong'],
    ['Qatar', 36, 'strong'],
    ['EmiratsArabesUnis', 37, 'standard'],
    ['Egypte', 38, 'standard'],
    ['Maroc', 39, 'standard'],
    ['Tunisie', 40, 'standard'],
    ['Algerie', 41, 'standard'],
    ['AfriqueDuSud', 42, 'standard'],
    ['Iran', 43, 'standard'],
    ['Israel', 44, 'standard'],
    ['Irlande', 45, 'standard'],
    ['PaysDeGalles', 46, 'standard'],
    ['IrlandeDuNord', 47, 'standard'],
    ['Hongrie', 48, 'standard'],
    ['Roumanie', 49, 'standard'],
    ['Slovaquie', 50, 'standard'],
    ['Slovenie', 51, 'standard'],
    ['Finlande', 52, 'standard'],
    ['BosnIeHerzegovine', 53, 'standard'],
    ['MacedoineduNord', 54, 'standard'],
    ['Montenegro', 55, 'standard'],
    ['Kosovo', 56, 'standard'],
    ['Azerbaidjan', 57, 'standard'],
    ['Georgie', 58, 'standard'],
    ['Islande', 59, 'standard'],
    ['Canada', 60, 'standard'],
    ['Venezuela', 61, 'standard'],
    ['Bolivie', 62, 'standard'],
    ['Panama', 63, 'standard'],
    ['Jamaique', 64, 'standard'],
    ['Honduras', 65, 'standard'],
    ['CostaRica', 66, 'standard'],
    ['Nigeria', 67, 'standard'],
    ['Senegal', 68, 'standard'],
    ['CoteDIvoire', 69, 'standard'],
    ['Ghana', 70, 'standard'],
    ['Cameroun', 71, 'standard'],
    ['Ouganda', 72, 'standard'],
    ['Tanzanie', 73, 'standard'],
    ['Kenya', 74, 'standard'],
    ['Inde', 75, 'minor'],
    ['Thailande', 76, 'minor'],
    ['Ouzbekistan', 77, 'minor'],
    ['Irak', 78, 'minor'],
    ['Oman', 79, 'minor'],
    ['Jordanie', 80, 'minor'],
    ['Bahrein', 81, 'minor'],
    ['Syrie', 82, 'minor'],
    ['Angola', 83, 'minor'],
    ['Congo', 84, 'minor'],
    ['RDCongo', 85, 'minor'],
    ['Guinee', 86, 'minor'],
    ['GuineeEquatoriale', 87, 'minor'],
    ['CapVert', 88, 'minor'],
    ['Gabon', 89, 'minor'],
    ['Benin', 90, 'minor'],
    ['BurkinaFaso', 91, 'minor'],
    ['Mauritanie', 92, 'minor'],
    ['Madagascar', 93, 'minor'],
    ['Mozambique', 94, 'minor'],
    ['Namibie', 95, 'minor'],
    ['Zimbabwe', 96, 'minor'],
    ['Zambie', 97, 'minor'],
    ['Mali', 98, 'minor'],
    ['Haiti', 99, 'minor'],
    ['Togo', 100, 'minor'],
    ['Libye', 101, 'minor'],
    ['Arabie', 102, 'minor'],
    ['International-Club', 103, 'archive_only'],
    ['International-Nation', 104, 'archive_only'],
    ['Pays', 105, 'archive_only']
];

const COMPETITION_TYPE_WEIGHTS = {
    league: 0,
    cup: 200,
    super_cup: 300,
    playoff: 150,
    friendly: 500,
    other: 400
};

async function ensureRankingColumns() {
    await db.run('CREATE SCHEMA IF NOT EXISTS v4');

    await db.run('ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS importance_rank INTEGER');
    await db.run('ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS importance_score NUMERIC(10,2)');
    await db.run('ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS rank_band TEXT');
    await db.run('ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS rank_source TEXT');
    await db.run('ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS rank_updated_at TIMESTAMPTZ');
    await db.run('ALTER TABLE v4.countries ADD COLUMN IF NOT EXISTS display_rank_override INTEGER');
    await db.run('CREATE INDEX IF NOT EXISTS idx_v4_countries_importance_rank ON v4.countries(importance_rank)');

    await db.run('ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS importance_rank INTEGER');
    await db.run('ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS importance_score NUMERIC(10,2)');
    await db.run('ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS rank_band TEXT');
    await db.run('ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS rank_source TEXT');
    await db.run('ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS rank_updated_at TIMESTAMPTZ');
    await db.run('ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS display_rank_override INTEGER');
    await db.run('ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS country_rank_snapshot INTEGER');
    await db.run('ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS data_depth_score NUMERIC(10,2)');
    await db.run('ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS type_weight INTEGER');
    await db.run('CREATE INDEX IF NOT EXISTS idx_v4_competitions_importance_rank ON v4.competitions(importance_rank)');
}

async function applyCountryRankings() {
    const existingCountries = await db.all('SELECT name FROM v4.countries');
    const existingSet = new Set(existingCountries.map((row) => row.name));

    let fallbackRank = COUNTRY_RANKINGS.length + 1;

    for (const [countryName, rank, band] of COUNTRY_RANKINGS) {
        if (!existingSet.has(countryName)) {
            continue;
        }

        await db.run(
            `
                UPDATE v4.countries
                SET importance_rank = ?,
                    importance_score = ?,
                    rank_band = ?,
                    rank_source = ?,
                    rank_updated_at = CURRENT_TIMESTAMP
                WHERE name = ?
            `,
            [rank, 1000 - rank, band, 'manual_product_baseline_2026', countryName]
        );
    }

    const unrankedCountries = await db.all(
        'SELECT name FROM v4.countries WHERE importance_rank IS NULL ORDER BY name ASC'
    );

    for (const row of unrankedCountries) {
        await db.run(
            `
                UPDATE v4.countries
                SET importance_rank = ?,
                    importance_score = ?,
                    rank_band = ?,
                    rank_source = ?,
                    rank_updated_at = CURRENT_TIMESTAMP
                WHERE name = ?
            `,
            [fallbackRank, 1000 - fallbackRank, 'archive_only', 'alphabetical_fallback_2026', row.name]
        );
        fallbackRank += 1;
    }
}

function computeCompetitionBand(rank) {
    if (rank <= 5) return 'elite';
    if (rank <= 15) return 'major';
    if (rank <= 35) return 'strong';
    if (rank <= 75) return 'standard';
    if (rank <= 100) return 'minor';
    return 'archive_only';
}

async function applyCompetitionRankings() {
    const competitions = await db.all(`
        SELECT
            c.competition_id::text AS competition_id,
            c.name,
            c.source_key,
            c.competition_type,
            co.importance_rank AS country_rank,
            COUNT(m.match_id) AS match_count,
            COUNT(DISTINCT m.season_label) AS season_count
        FROM v4.competitions c
        LEFT JOIN v4.countries co ON co.country_id = c.country_id
        LEFT JOIN v4.matches m ON m.competition_id = c.competition_id
        GROUP BY c.competition_id, c.name, c.source_key, c.competition_type, co.importance_rank
        ORDER BY co.importance_rank NULLS LAST, c.name ASC
    `);

    const ranked = competitions
        .map((competition) => {
            const countryRank = competition.country_rank ?? 999;
            const typeWeight = COMPETITION_TYPE_WEIGHTS[competition.competition_type] ?? COMPETITION_TYPE_WEIGHTS.other;
            const matchCount = Number(competition.match_count || 0);
            const seasonCount = Number(competition.season_count || 0);
            const dataDepthScore = Math.min(99, Math.round((matchCount / 1000) * 10 + seasonCount * 2));
            const importanceScore = countryRank * 1000 + typeWeight - dataDepthScore;

            return {
                ...competition,
                countryRank,
                typeWeight,
                dataDepthScore,
                importanceScore
            };
        })
        .sort((a, b) => {
            if (a.importanceScore !== b.importanceScore) {
                return a.importanceScore - b.importanceScore;
            }
            return String(a.name).localeCompare(String(b.name));
        });

    for (const [index, competition] of ranked.entries()) {
        const rank = index + 1;
        await db.run(
            `
                UPDATE v4.competitions
                SET importance_rank = ?,
                    importance_score = ?,
                    rank_band = ?,
                    rank_source = ?,
                    rank_updated_at = CURRENT_TIMESTAMP,
                    country_rank_snapshot = ?,
                    data_depth_score = ?,
                    type_weight = ?
                WHERE source_key = ?
            `,
            [
                rank,
                competition.importanceScore,
                computeCompetitionBand(competition.countryRank),
                'country_rank_plus_competition_type_2026',
                competition.countryRank,
                competition.dataDepthScore,
                competition.typeWeight,
                competition.source_key
            ]
        );
    }
}

async function main() {
    await db.init();
    await ensureRankingColumns();
    await applyCountryRankings();
    await applyCompetitionRankings();
    logger.info('V4 importance rankings applied');
    process.exit(0);
}

main().catch((error) => {
    logger.error({ err: error }, 'Failed to apply V4 importance rankings');
    process.exit(1);
});
