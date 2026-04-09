import os


ML_SERVICE_ROOT = os.path.dirname(os.path.abspath(__file__))
MODELS_ROOT = os.path.join(ML_SERVICE_ROOT, "models")


def get_models_root():
    return MODELS_ROOT


def get_submodel_dir(model_name):
    return os.path.join(MODELS_ROOT, model_name)


def get_submodel_pair_paths(model_name, home_filename, away_filename):
    model_dir = get_submodel_dir(model_name)
    return {
        "dir": model_dir,
        "home": os.path.join(model_dir, home_filename),
        "away": os.path.join(model_dir, away_filename),
    }


def get_ft_poisson_paths():
    return get_submodel_pair_paths(
        "ft_result",
        "catboost_baseline_v0_home.cbm",
        "catboost_baseline_v0_away.cbm",
    )


def get_ht_poisson_paths(version="v0"):
    return get_submodel_pair_paths(
        "ht_result",
        f"catboost_baseline_{version}_home.cbm",
        f"catboost_baseline_{version}_away.cbm",
    )


def get_corners_poisson_paths(version="v1"):
    return get_submodel_pair_paths(
        "corners_total",
        f"catboost_corners_{version}_home.cbm",
        f"catboost_corners_{version}_away.cbm",
    )


def get_cards_poisson_paths(version="v1"):
    return get_submodel_pair_paths(
        "cards_total",
        f"catboost_cards_{version}_home.cbm",
        f"catboost_cards_{version}_away.cbm",
    )


def get_goals_poisson_paths(version="v1"):
    return get_submodel_pair_paths(
        "goals_total",
        f"catboost_goals_{version}_home.cbm",
        f"catboost_goals_{version}_away.cbm",
    )


def get_global_1x2_model_path():
    return os.path.join(ML_SERVICE_ROOT, "model_1x2.joblib")


def get_global_1x2_model_dir():
    return get_submodel_dir("global_1x2")


def get_global_1x2_horizon_model_path(horizon_slug: str):
    model_dir = get_global_1x2_model_dir()
    return os.path.join(model_dir, f"model_1x2_{horizon_slug}.joblib")


def get_global_1x2_model_path_for_horizon(horizon_type: str):
    horizon_map = {
        "FULL_HISTORICAL": "full_historical",
        "5Y_ROLLING": "5y_rolling",
        "3Y_ROLLING": "3y_rolling",
    }
    horizon_slug = horizon_map.get(horizon_type)
    if horizon_slug:
        candidate = get_global_1x2_horizon_model_path(horizon_slug)
        if os.path.exists(candidate):
            return candidate
    return get_global_1x2_model_path()


def _suffix_file(path, suffix):
    root, ext = os.path.splitext(path)
    return f"{root}_{suffix}{ext}"


def with_horizon_suffix(pair_paths, horizon_slug):
    return {
        "dir": pair_paths["dir"],
        "home": _suffix_file(pair_paths["home"], horizon_slug),
        "away": _suffix_file(pair_paths["away"], horizon_slug),
    }
