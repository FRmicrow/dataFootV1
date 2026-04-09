# US_181: Time-Travel Fetcher (Leakage-Proof Extractor)

## Mission
Technical engineering of a data extractor that fetches fixtures and their associated features exactly as they were known at a specific point in time (pre-match). This is critical to prevent data leakage during backtesting.

## Mission Details
1. **As-of-Date Logic**: Filter all data points (form, player stats, standings) by `date < fixture_date`.
2. **Snapshot Recovery**: Prioritize using `V3_Feature_Snapshots` if available, otherwise reconstruct from historical tables.
3. **Sequential Processing**: Ensure that during a season replay, the model only "sees" what happened before the current match day.

## Success Criteria
- [ ] No future-data contamination (zero leakage).
- [ ] Support for fetching features for any historical fixture.
- [ ] Integration with the ML service's feature builder.
