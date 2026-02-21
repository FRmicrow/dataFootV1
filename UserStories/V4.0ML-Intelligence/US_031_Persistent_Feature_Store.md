# US_031: Persistent ML Feature Store & Delta Logic

## 🎯 High-Level Objective
Protect the CPU and data integrity by never re-calculating the same match twice. Create a permanent database "Lock" for extracted features so that "Empowerment" only focuses on new data.

## 📋 Requirements
1. **DB Schema**: Create `V3_ML_Feature_Store` table.
   - `fixture_id` (Primary Key).
   - `league_id`.
   - `feature_vector` (JSON blob of all ELO, Form, and performance markers).
   - `calculated_at` (Timestamp).
2. **Delta Identification**: When a league is triggered for empowerment, the system must perform a `LEFT JOIN` or `NOT IN` check to find only the fixtures NOT in the Feature Store.
3. **Manual Override**: Provide a "Rebuild League Store" button for when the model architecture changes and we explicitly need to re-verify history.

## ✅ Acceptance Criteria (AC)
- [ ] Database contains the `V3_ML_Feature_Store` table with indices on `fixture_id` and `league_id`.
- [ ] If I empower Premier League today (8,000 matches), the features are saved to the DB.
- [ ] If I import 1 match tomorrow and click "Empower", the log should show: *"1 pending found, 8,000 skipped (cached)"*.
- [ ] The system handles partial failures: if 500 matches are processed and the power goes out, the 500 are saved and not re-calculated later.

## 🛠️ Technical Implementation Notes
- **Python**: Modify `db/reader.py` (or new `db/writer.py`) to allow the Python service to WRITE to this specific table only (overriding the `query_only=ON` pragma for this task).
- **Efficiency**: Use bulk inserts (transactional) every 100 features to avoid SQLite locking issues with Node.js.
