from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


SUPPORTED_HORIZONS = ("FULL_HISTORICAL", "5Y_ROLLING", "3Y_ROLLING")


@dataclass(frozen=True)
class HorizonWindow:
    horizon_type: str
    max_date: pd.Timestamp
    min_date_included: pd.Timestamp | None
    dataset_size: int


def normalize_horizon_type(horizon_type: str) -> str:
    value = (horizon_type or "FULL_HISTORICAL").upper()
    if value not in SUPPORTED_HORIZONS:
        raise ValueError(f"Unsupported horizon_type={horizon_type}. Expected one of {SUPPORTED_HORIZONS}")
    return value


def horizon_years(horizon_type: str) -> int | None:
    normalized = normalize_horizon_type(horizon_type)
    if normalized == "5Y_ROLLING":
        return 5
    if normalized == "3Y_ROLLING":
        return 3
    return None


def filter_dataframe_by_horizon(df: pd.DataFrame, date_column: str, horizon_type: str) -> tuple[pd.DataFrame, HorizonWindow]:
    normalized = normalize_horizon_type(horizon_type)
    frame = df.copy()
    frame[date_column] = pd.to_datetime(frame[date_column], utc=True, errors="coerce")
    frame = frame.dropna(subset=[date_column]).sort_values(date_column)
    if frame.empty:
        return frame, HorizonWindow(normalized, pd.NaT, None, 0)

    max_date = frame[date_column].max()
    years = horizon_years(normalized)
    if years is None:
        return frame, HorizonWindow(normalized, max_date, None, int(len(frame)))

    cutoff = max_date - pd.DateOffset(years=years)
    filtered = frame[frame[date_column] >= cutoff].copy()
    return filtered, HorizonWindow(normalized, max_date, cutoff, int(len(filtered)))
