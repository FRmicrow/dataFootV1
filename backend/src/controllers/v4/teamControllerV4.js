import { z } from 'zod';
import TeamServiceV4 from '../../services/v4/TeamServiceV4.js';
import logger from '../../utils/logger.js';

const teamParamsSchema = z.object({
    id: z.string().min(1)
});

const teamQueryParamsSchema = z.object({
    season: z.string().optional(),
    competitionId: z.string().optional(),
    limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 20)
});

export const getTeamProfileV4 = async (req, res) => {
    try {
        const { id } = teamParamsSchema.parse(req.params);
        const { season, competitionId } = teamQueryParamsSchema.parse(req.query);

        const team = await TeamServiceV4.getTeamProfile(id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found in V4' });
        }

        const resolvedId = team.team_id;
        const seasons = await TeamServiceV4.getTeamSeasons(resolvedId);
        const availableSeasons = [...new Set(seasons.map(s => s.season_label))];
        
        // Use provided season or latest
        const activeSeason = season || (availableSeasons[0] || null);

        let squad = [];
        let summary = null;
        if (activeSeason) {
            squad = await TeamServiceV4.getTeamSquad(resolvedId, activeSeason, competitionId);
            summary = await TeamServiceV4.getTeamSummary(resolvedId, activeSeason, competitionId);
        }

        res.json({
            success: true,
            data: {
                team: {
                    id: team.team_id,
                    name: team.name,
                    official_name: team.official_name,
                    short_name: team.short_name,
                    logo_url: team.logo_url,
                    country: team.country_name,
                    country_flag: team.country_flag,
                    founded: team.founded,
                    venue_name: team.venue_name,
                    venue_city: team.venue_city,
                    venue_capacity: team.venue_capacity,
                    venue_image: team.venue_image_url,
                    accent_color: team.accent_color,
                    secondary_color: team.secondary_color,
                    tertiary_color: team.tertiary_color,
                    description: team.description
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
        logger.error({ err: error, teamId: req.params.id }, 'V4 Team Profile Controller Error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getTeamMatchesV4 = async (req, res) => {
    try {
        const { id } = teamParamsSchema.parse(req.params);
        const { season, competitionId, limit } = teamQueryParamsSchema.parse(req.query);

        const matches = await TeamServiceV4.getTeamMatches(id, {
            seasonLabel: season,
            competitionId,
            limit
        });

        res.json({
            success: true,
            data: matches
        });
    } catch (error) {
        logger.error({ err: error, teamId: req.params.id }, 'V4 Team Matches Controller Error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getTeamSquadV4 = async (req, res) => {
    try {
        const { id } = teamParamsSchema.parse(req.params);
        const { season, competitionId } = teamQueryParamsSchema.parse(req.query);

        if (!season) {
            return res.status(400).json({ success: false, error: 'Season is required for squad' });
        }

        const squad = await TeamServiceV4.getTeamSquad(id, season, competitionId);
        res.json({
            success: true,
            data: squad
        });
    } catch (error) {
        logger.error({ err: error, teamId: req.params.id }, 'V4 Team Squad Controller Error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};
