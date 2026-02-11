# EXECUTION_PLAN_Content_Studio.md

# Execution Plan: V3 Content Studio (No-Mock Edition)

The implementation of the **Content Studio** has been refined to strictly use **Real V3 Database Data** with no mocks, ensuring accurate and dynamic visualization capabilities.

## 📂 User Stories

| Phase | US ID | Type | Description |
|---|---|---|---|
| **1. Backend** | `BUG_28a_V3_BE_POC_Studio_Data_Flow_Fix` | **Backend** | Re-implements API endpoints (`/generate`, `/stats`) to query real DB tables (`V3_Player_Stats`). |
| **2. Form** | `BUG_28b_V3_FE_POC_Studio_Form_Flow_Fix` | **Frontend** | Re-implements Studio Config Form to populate dropdowns from API and handle dynamic filtering. |
| **3. Bar Chart** | `BUG_28c_V3_FE_POC_Studio_Bar_Chart_Impl` | **Frontend** | Implements D3 Bar Chart Race using real `cumulative` data frames. |
| **4. Other Charts**| `BUG_28d_V3_FE_POC_Studio_Other_Charts_Impl`| **Frontend** | Implements Line & Radar charts with dynamic axes and normalization. |
| **5. Recording** | `BUG_28e_V3_FE_POC_Recording_Auto_Reset` | **Frontend** | (From previous step) Implements MediaRecorder with auto-reset logic. |

## 🚀 Recommended Parallel Execution

1.  **Start Backend Agent** on `BUG_28a` (Critical Path).
2.  **Start Frontend Agent** on `BUG_28b` (Form Logic).
    *   *Note: FE Agent can mock the API response definition temporarily while BE builds, but integration requires BE.*
3.  **Once 28a & 28b are ready**, execute `BUG_28c` and `BUG_28d`.
4.  Finally, execute `BUG_28e` for the export feature.

---
**Ready to Launch.**
