# Implementation Plan - V36: Data & ML Foundations Refactor

## Delivery Order
1. Audit remediation
2. Unified runtime and contract definition
3. Feature store redesign
4. Reference market pipeline `1X2_FT`
5. Extension to `GOALS_OU`
6. Extension to `1X2_HT`
7. Extension to `CORNERS_OU` and `CARDS_OU`
8. Real historical windows `full / 5y / 3y`
9. League-specific eligibility policy
6. Unified orchestration and evaluation
7. Observability and QA evidence

## Blocking Rules
- No implementation of new pipelines before US-3601 to US-3606 are closed
- No market pipeline before feature blocks and persistence contracts are specified
- No trusted risk analysis before market mapping and evaluation are aligned

## Work Breakdown
### Phase 0 - Audit remediation
- US-3601 to US-3606
- Deliver a remediation summary with proof points

### Phase 1 - Contract and feature store target
- US-3610 to US-3617
- Produce the target catalog, persistence contract, and feature block map
- Freeze the contract stabilization method before any retraining
- Prioritize team feature enrichment on:
  - Premier League
  - La Liga
  - Bundesliga
  - Serie A
  - Ligue 1
  - Champions League
  - Europa League
  - then Primeira Liga, Eredivisie, Belgian Pro League, Europa Conference League

### Phase 2 - Reference pipelines
- US-3620 to US-3626
- Rebuild one clean vertical slice, then extend market by market in this order:
  1. `1X2_FT`
  2. `GOALS_OU`
  3. `1X2_HT`
  4. `CORNERS_OU`
  5. `CARDS_OU`
- Activate league-specific variants only after real `full / 5y / 3y` horizons exist

### Phase 3 - Orchestration and observability
- US-3630 to US-3633
- Unify outputs, evaluation, and monitoring

## Roles Activated
- Product Owner
- Product Architect
- Machine Learning Engineer
- Backend Engineer
- FullStack Engineer

## Skills Activated By Feature
- `project-context`
- `machine-learning`
- `data-analyzer`
- `code-quality`
- `docs`
- `testing`
- `productivity`
- `web-dev`
- `design`

## Validation Strategy
- Each US includes explicit QA scenarios
- PostgreSQL is the only runtime considered valid for this feature
- No destructive DB operations are allowed
- Global generic models are the baseline; league-specific models must prove superiority before activation
