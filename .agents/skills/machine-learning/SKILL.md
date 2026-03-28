---
name: machine-learning
description: Predictive models and data science for football stats. Use when working with match prediction, xG models, or player performance analytics.
---

# Machine Learning Skill

This skill provides expertise in developing, training, and deploying predictive models for the `statFootV3` project.

## When to use
Use this skill for tasks related to:
- Designing and implementing football prediction models.
- Training models on historical match and player data.
- Evaluating model performance (Accuracy, Brier score, F1).
- Integrating ML models into the backend via API services.
- Automating data pre-processing for inference.

## Hard Rules (CRITICAL)
- **Model Choice**: Use **CatBoost** or similar gradient boosting models for structured football data.
- **Validation**: Ensure proper train/validation/test splits to avoid data leakage.
- **Interpretabiltiy**: Analyze feature importance to explain model predictions.
- **Deployment**: Encapsulate models in a service (usually in `ml-service/`) with a stable API.

## Best Practices
1. **Feature Engineering**: Create meaningful indicators like team form, player ratings (pi-ratings), and xG differentials.
2. **Data Cleaning**: Handle missing values and outliers carefully.
3. **Monitoring**: Track model performance over time and re-train periodically with new data.
4. **Reproduce**: Use seed values for random processes to ensure reproducible results.

## Integration
- Works with the `data-analyzer` skill for data preparation.
- Works with the `backend` skill for API integration.
- Supports the `design` skill by providing data for visual storytelling.
