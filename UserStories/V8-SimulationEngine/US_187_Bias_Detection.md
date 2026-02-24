# 👤 US_187: Bias & Overconfidence Alerts
**Accountable Agent**: ML Agent / Quant Analyst
**Feature Type**: Deep Performance Analysis
**Mission**: Automated detection of model weaknesses and systematic biases in specific leagues or conditions.

---

## 🎯 Strategic Objective
Continuous improvement through failure analysis. Identify if the model has an "Overconfidence Bias" or if it consistently fails in high-scoring leagues.

## 📋 Functional Requirements
- **Bias Report**: Identification of groups (leagues, odds-ranges) where Brier Score is significantly poor.
- **Overconfidence Detector**: Flag if predicted probability > 85% results in < 60% actual wins.
- **League Recalibration Suggester**: Notify which leagues might need different feature weights.

## ✅ Acceptance Criteria
- Simulation UI shows a "Bias Warning" panel if metrics are unstable.
- A "Confusion Matrix" is generated for every full-league simulation.
