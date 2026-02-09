# User Story: V3 POC - Navigation, Layout & Integration

**ID**: US-V3-POC-003  
**Title**: V3 Feature Access & Dashboard Navigation  
**Role**: Frontend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User testing the V3 features,  
**I want** a dedicated V3 "Playground" with clear navigation,  
**So that** I can easily jump between the Import tool, the Dashboard, and the League list without mixing V2/V3 contexts.

---

## 🎨 Context & Problem
Currently, V3 features are hidden or hard to access. We need a "V3 Mode" toggle or section.

---

## ✅ Acceptance Criteria

### 1. Global Navigation Update
- [ ] **Navbar Entry**: Add a "🧪 V3 POC" button/link to the main application navigation bar (top right or sidebar).
    - Link to `/v3/dashboard`.

### 2. V3 Layout & Sidebar
- [ ] **Layout Component**: Create `V3Layout.jsx`.
    - Apply a distinct "V3 Theme" (e.g., slight color shift or badge) to indicate "Experimental Mode".
- [ ] **Lateral Panel (Sidebar)**:
    - **"Dashboard"**: Overview of V3 data stats.
    - **"Import Tool"**: Link to `/v3/import` (New Multi-Import Page).
    - **"Leagues Data"**: Link to `/v3/leagues` (List of imported leagues).
    - **"Exit V3"**: Link back to home `/`.

### 3. Dashboard Page (`/v3/dashboard`)
- [ ] Simple landing page showing: "Welcome to V3 POC - [X] Leagues Imported, [Y] Players Imported".

---

## 🛠 Technical Notes
- **Router**: Verify `V3Layout` wraps all `/v3/*` routes in `App.js`.
