import { z } from 'zod';
import ClubServiceV4 from '../../services/v4/ClubServiceV4.js';
import logger from '../../utils/logger.js';

const clubParamsSchema = z.object({
    id: z.string().min(1)
});

const clubQueryParamsSchema = z.object({
    season: z.string().optional(),
    competitionId: z.string().optional(),
    limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 20)
});

export const getClubProfileV4 = async (req, res) => {
    try {
        const { id } = clubParamsSchema.parse(req.params);
        const { season, competitionId } = clubQueryParamsSchema.parse(req.query);

        const club = await ClubServiceV4.getClubProfile(id);
        if (!club) {
            return res.status(404).json({ success: false, error: 'Club not found in V4' });
        }

        const resolvedId = club.club_id;
        const seasons = await ClubServiceV4.getClubSeasons(resolvedId);
        const availableSeasons = [...new Set(seasons.map(s => s.season_label))];
        
        // Use provided season or latest
        const activeSeason = season || (availableSeasons[0] || null);

        let squad = [];
        let summary = null;
        if (activeSeason) {
            squad = await ClubServiceV4.getClubSquad(resolvedId, activeSeason, competitionId);
            summary = await ClubServiceV4.getClubSummary(resolvedId, activeSeason, competitionId);
        }

        res.json({
            success: true,
            data: {
                club: {
                    id: club.club_id,
                    name: club.name,
                    official_name: club.official_name,
                    short_name: club.short_name,
                    logo_url: club.logo_url,
                    country: club.country_name,
                    country_flag: club.country_flag,
                    founded: club.founded,
                    venue_name: club.venue_name,
                    venue_city: club.venue_city,
                    venue_capacity: club.venue_capacity,
                    venue_image: club.venue_image_url,
                    accent_color: club.accent_color,
                    secondary_color: club.secondary_color,
                    tertiary_color: club.tertiary_color,
                    description: club.description
                },
                seasons,
                availableYears: availableSeasons,
                rosterYear: activeSeason,
                roster: squad,
                summary
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Invalid parameters' });
        }
        logger.error({ err: error, clubId: req.params.id }, 'V4 Club Profile Controller Error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getClubMatchesV4 = async (req, res) => {
    try {
        const { id } = clubParamsSchema.parse(req.params);
        const { season, competitionId, limit } = clubQueryParamsSchema.parse(req.query);

        const matches = await ClubServiceV4.getClubMatches(id, {
            seasonLabel: season,
            competitionId,
            limit
        });

        res.json({
            success: true,
            data: matches
        });
    } catch (error) {
        logger.error({ err: error, clubId: req.params.id }, 'V4 Club Matches Controller Error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getClubSquadV4 = async (req, res) => {
    try {
        const { id } = clubParamsSchema.parse(req.params);
        const { season, competitionId } = clubQueryParamsSchema.parse(req.query);

        if (!season) {
            return res.status(400).json({ success: false, error: 'Season is required for squad' });
        }

        const squad = await ClubServiceV4.getClubSquad(id, season, competitionId);
        res.json({
            success: true,
            data: squad
        });
    } catch (error) {
        logger.error({ err: error, clubId: req.params.id }, 'V4 Club Squad Controller Error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};
