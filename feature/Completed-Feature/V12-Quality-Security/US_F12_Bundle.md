📂 Created User Stories (/UserStories/V12-Quality-Security/)

Feature Name: DataFoot V1 Quality & DevSecOps Shield
Version: V12
Global Feature Type: Architecture Upgrade & Security
Scope: DevOps / Infra / Full Stack

---

US_250: Local Quality Hub with SonarQube
Feature Type: Architecture Upgrade
Role: DevOps / Full Stack
Goal: Implement a local SonarQube instance to allow the AI agent to interact with quality results via API and avoid GitHub workflow dependencies.

Core Task: Configure local SonarQube with `@sonar/scan` and local properties.

Functional Requirements:
- Local SonarQube instance running at `http://localhost:9000`.
- Direct API interaction for the AI agent (`/api/issues/search`).
- Scan trigger via `npx @sonar/scan` from the project root.

Technical Requirements:
- Create `.github/workflows/sonarcloud.yml`:
    - Use `actions/checkout@v3` with `fetch-depth: 0`.
    - Setup Node 18 environments.
    - Install dependencies in `frontend` and `backend`.
    - Execute test suites with coverage generation (`--coverage`).
    - Run `SonarSource/sonarcloud-github-action@v2`.
- Create `sonar-project.properties` at root:
    - `sonar.projectKey=FRmicrow_dataFootV1`
    - `sonar.organization=frmicrow`
    - `sonar.sources=frontend/src,backend/src`
    - `sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**`
    - `sonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info,backend/coverage/lcov.info`

Acceptance Criteria:
- SonarQube is reachable at `http://localhost:9000`.
- Local scan runs successfully with coverage reports.
- AI Agent can query local API for issue remediation.

---

US_251: Full-Spectrum Security Remediation
Feature Type: Security
Role: Full Stack
Goal: Resolve critical vulnerabilities and security hotspots identified by the SonarCloud initial scan to protect user data and system integrity.

Core Task: Analyze the first SonarCloud report and apply fixes for all "Critical" and "Major" security issues.

Functional Requirements:
- Fix SQL Injection risks (ensure all queries use prepared statements/parameterized input).
- Resolve any XSS vulnerabilities in the React frontend.
- Secure API endpoints (Check for missing rate limiting or weak authentication headers).
- Remove any hardcoded secrets or sensitive logs.

Technical Requirements:
- Audit `backend/src/controllers` for raw SQL string concatenation.
- Verify `frontend/src` for `dangerouslySetInnerHTML` usage.
- Apply `helmet` or similar security headers if flagged.

Acceptance Criteria:
- "Security" and "Reliability" ratings on SonarCloud improve to 'A'.
- No "Critical" vulnerabilities remaining in the project.

---

US_252: Test Coverage Harmonization
Feature Type: Bug Fix / Architecture Upgrade
Role: Full Stack
Goal: Standardize test coverage reporting to ensure SonarCloud provides an accurate view of the project's tested code percentage.

Core Task: Configure both Frontend (Jest) and Backend (Mocha/Jest) to export LCOV coverage files to the expected paths.

Functional Requirements:
- Ensure `frontend/coverage/lcov.info` is generated after `npm test`.
- Ensure `backend/coverage/lcov.info` is generated after `npm test`.
- Update `package.json` scripts to include code coverage flags by default for CI.

Technical Requirements:
- Standardize test scripts in `package.json`.
- Map the generated paths in `sonar-project.properties`.

Acceptance Criteria:
- SonarCloud displays a unified coverage percentage for the entire repository.
- Coverage reports are successfully uploaded during the GitHub Action run.

---

### 📋 User Story & Agent Allocation

| US ID | Title | Feature Type | Primary Agent |
| :--- | :--- | :--- | :--- |
| **US_250** | Automated Quality Hub with SonarCloud | Architecture Upgrade | DevOps / Backend |
| **US_251** | Full-Spectrum Security Remediation | Security | Full Stack |
| **US_252** | Test Coverage Harmonization | Architecture Upgrade | Full Stack |

---

🔍 Audit & Assumptions

Current system limitations identified:
- The project currently lacks a unified CI suite, making code regressions hard to detect without manual testing.
- Manual SQL queries in some older parts of the backend might contain unsanitized inputs.

Technical debt detected:
- Test suites may be incomplete in some legacy modules, leading to low initial coverage scores.

Migration risks:
- Initial scan might reveal a high volume of "Code Smells" which could overwhelm the team if not prioritized correctly.

---

🎨 UX & Product Strategy

Why this feature improves the product:
- **Trust & Reliability**: Ensures the platform is robust against common web vulnerabilities.
- **Maintainability**: Cleaner code leads to faster feature development and fewer side-effect bugs.
- **Developer Experience**: Automatic feedback loop on PRs helps maintain high standards without manual friction.

---

### 🛠 Hand-off Instruction for the Team

DEVOPS AGENT:
- Create the `.github/workflows/sonarcloud.yml` and `sonar-project.properties` (US_250).
- Ensure the user has added `SONAR_TOKEN` to GitHub Secrets.

FULL STACK AGENT:
- Execute the first scan and prioritize fixing "Critical" vulnerabilities in the SQL layer (US_251).
- Standardize test coverage exports for both sub-projects (US_252).

📊 Definition of Done
The feature is complete when:
- SonarCloud Badge shows "Passing" for the main branch.
- Critical vulnerabilities (SQL injection, XSS) are 0.
- Standardized coverage reporting is active.
- The `SONAR_TOKEN` secret is active in GitHub Actions.
