GLOBAL_1X2_FEATURE_SCHEMA_VERSION = "global_1x2_v3"

GLOBAL_1X2_FEATURE_COLUMNS = [
    "mom_gd_h3", "mom_gd_h5", "mom_gd_h10", "mom_gd_h20",
    "mom_pts_h3", "mom_pts_h5", "mom_pts_h10", "mom_pts_h20",
    "win_rate_h5", "win_rate_h10", "cs_rate_h5", "cs_rate_h10",
    "mom_gd_a3", "mom_gd_a5", "mom_gd_a10", "mom_gd_a20",
    "mom_pts_a3", "mom_pts_a5", "mom_pts_a10", "mom_pts_a20",
    "win_rate_a5", "win_rate_a10", "cs_rate_a5", "cs_rate_a10",
    "rest_h", "rest_a",
    "venue_diff_h", "venue_diff_a",
    "def_res_h", "def_res_a",
    "home_b_elo", "away_b_elo", "diff_elo",
    "home_b_rank", "away_b_rank", "diff_rank",
    "home_b_points", "away_b_points", "diff_points",
    "home_b_goals_diff", "away_b_goals_diff", "diff_goals_diff",
    "home_b_played", "away_b_played",
    "home_b_lineup_strength_v1", "away_b_lineup_strength_v1", "diff_lineup_strength",
    "home_b_missing_starters_count", "away_b_missing_starters_count",
    "home_p_possession_avg_5", "away_p_possession_avg_5", "diff_possession_l5",
    "home_p_control_index_5", "away_p_control_index_5", "diff_control_l5",
    "home_p_shots_per_match_5", "away_p_shots_per_match_5", "diff_shots_l5",
    "home_p_sot_per_match_5", "away_p_sot_per_match_5", "diff_sot_l5",
    "home_p_corners_per_match_5", "away_p_corners_per_match_5", "diff_corners_l5",
    "home_p_fouls_per_match_5", "away_p_fouls_per_match_5", "diff_fouls_l5",
    "home_p_yellow_per_match_5", "away_p_yellow_per_match_5", "diff_yellow_l5",
    "home_p_red_per_match_5", "away_p_red_per_match_5", "diff_red_l5",
    "home_p_pass_acc_rate_5", "away_p_pass_acc_rate_5",
    "home_p_sot_rate_5", "away_p_sot_rate_5",
    "home_p_shot_volume_1h_share_5", "away_p_shot_volume_1h_share_5",
    "home_p_sot_volume_1h_share_5", "away_p_sot_volume_1h_share_5",
    "home_p_corner_volume_1h_share_5", "away_p_corner_volume_1h_share_5",
    "home_p_non_sot_rate_5", "away_p_non_sot_rate_5",
    "home_p_corner_to_shot_rate_5", "away_p_corner_to_shot_rate_5",
    "home_p_cards_per_foul_5", "away_p_cards_per_foul_5",
    "home_p_cards_pressure_5", "away_p_cards_pressure_5",
    "home_p_possession_to_shot_5", "away_p_possession_to_shot_5",
    "home_p_xg_per_shot_5", "away_p_xg_per_shot_5",
    "home_p_xg_per_sot_5", "away_p_xg_per_sot_5",
    "mom_xg_f_h5", "mom_xg_f_h10", "mom_xg_a_h5", "mom_xg_a_h10", "xg_eff_h5",
    "mom_xg_f_a5", "mom_xg_f_a10", "mom_xg_a_a5", "mom_xg_a_a10", "xg_eff_a5",
    "diff_xg_for_l5", "diff_xg_against_l5", "diff_xg_eff_l5",
    "matchup_tempo_sum_5", "matchup_shot_quality_gap_5",
    "matchup_possession_gap_5", "matchup_control_gap_5",
    "matchup_corner_pressure_sum_5", "matchup_discipline_sum_5",
    "matchup_foul_intensity_sum_5", "matchup_first_half_tempo_sum_5",
    "matchup_first_half_sot_sum_5", "matchup_open_game_index_5",
    "competition_importance", "country_importance",
    "is_cup", "is_league", "is_international_competition",
    "is_knockout", "stage_weight",
    "is_derby", "travel_km", "high_stakes",
]


def _clean_feature_value(value):
    try:
        numeric = float(value)
        if numeric != numeric or numeric in (float("inf"), float("-inf")):
            return 0.0
        return numeric
    except (TypeError, ValueError):
        return 0.0


def normalize_feature_vector(vector, expected_columns=GLOBAL_1X2_FEATURE_COLUMNS):
    vector = vector or {}
    return {column: _clean_feature_value(vector.get(column, 0.0)) for column in expected_columns}


def inspect_feature_vector(vector, expected_columns=GLOBAL_1X2_FEATURE_COLUMNS):
    vector = vector or {}
    actual_columns = set(vector.keys())
    expected = set(expected_columns)
    return {
        "missing": sorted(expected - actual_columns),
        "extra": sorted(actual_columns - expected),
    }
