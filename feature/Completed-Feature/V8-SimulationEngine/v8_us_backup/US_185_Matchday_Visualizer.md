# 👤 US_185: Matchday Visualizer
**Accountable Agent**: Frontend Developer
**Feature Type**: Detailed Data View
**Mission**: A direct "Side-by-Side" comparison view between the model's time-travel prediction and the actual historical result.

---

## 🎯 Strategic Objective
Build trust through transparency. Allow the user to "drill down" into specific matchdays to see exactly where the model succeeded or failed.

## 📋 Functional Requirements
- **Revealer Grid**: Matchday fixtures with a "Toggle Truth" button that hides/shows real results.
- **Outcome Indicators**: 🟢 (Exact Match), 🟡 (Correct Winner), 🔴 (Miss).
- **Probability Heat**: Color-code probability cells (e.g., Deep Green for > 70% confidence).

## ✅ Acceptance Criteria
- Fixture entries clearly show prob_home, prob_draw, prob_away.
- "Exact Match" requires both home and away scores to be correctly predicted.
- Support for "Key Absent Players" indicators in the match detail.
