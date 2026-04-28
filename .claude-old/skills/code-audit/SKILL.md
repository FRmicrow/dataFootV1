---
name: code-audit
description: Perform a systematic technical audit of the codebase covering architecture, code quality, security, database patterns, tests, and documentation.
triggers:
  - code audit
  - audit technique
  - health check
  - code health
  - dette technique
---

# Code Audit Skill

## Overview

Conducts a comprehensive technical audit of the statFootV3/V4 project. The audit identifies quality issues, security gaps, architectural debt, and missing documentation across all layers.

## Audit Phases

### Phase 1: Architecture & Structure (Parallel Agent)
- [ ] Cartography: directory structure, layers, file counts
- [ ] Module boundaries: separation of concerns
- [ ] Dependencies: internal coupling, external services
- [ ] Version split: V3 vs V4 completeness
- [ ] Key files identification

**Agent:** Explore (architecture focus)

### Phase 2: Code Quality & Security (Parallel Agent)
- [ ] Duplication (DRY violations, constants, logic)
- [ ] Code smell: long functions, complex logic, dead code
- [ ] Console usage: `console.*` in production code
- [ ] Parameterized queries: SQL injection risk
- [ ] Unprotected routes: missing auth/validation
- [ ] Error handling: silent catches, missing logging

**Agent:** Explore (quality + security focus)

### Phase 3: Tests, Documentation, DX (Parallel Agent)
- [ ] Test coverage: unit/integration/e2e gaps
- [ ] Critical paths without tests
- [ ] API documentation: Swagger completeness
- [ ] CLAUDE.md: patterns, rules clarity
- [ ] .env.example: variables documented
- [ ] Setup scripts: dev environment friction
- [ ] Inline markers: @STUB, @AUDIT, @CRITICAL usage

**Agent:** Explore (tests + docs + DX focus)

### Phase 4: Synthesis & Report (Sequential Agent)
- [ ] Consolidate findings from 3 agents
- [ ] Deduplicate issues
- [ ] Assign severity (critical/high/medium/low)
- [ ] Calculate priorities (impact × ease)
- [ ] Generate structured audit report

**Agent:** Plan (synthesis + report generation)

## Output Artifacts

### Primary: Audit Report
**File:** `docs/AUDIT-REPORT-{YYYY-MM-DD}.md`

Structure:
```
# Audit Report {Date}

## Executive Summary
- Maturity level (0-10)
- Critical risks (top 3)
- Top priorities

## Issues Table
| Title | Severity | Area | Recommendation | Priority |

## Plan d'Action
- Quick wins
- Court terme
- Moyen terme
- Long terme

## System of Markers
[Examples of @STUB, @AUDIT, @CRITICAL, etc.]
```

### Secondary: Remediation Update
**File:** `docs/AUDIT-REMEDIATION-PLAN.md`

Updates existing remediation plan with:
- New findings flagged
- Resolved items marked
- Timeline for remaining items

## When to Use This Skill

- **Triggered by keywords:** "audit", "health check", "code audit", "dette technique"
- **Periodic reviews:** quarterly or after major refactoring
- **Before major merges:** to risk-assess incoming changes
- **Onboarding new contributors:** audit provides quality baseline
- **Post-incident:** audit detects root causes beyond immediate fix

## What Gets Audited

### Always
- Security: routes, SQL, validation, auth
- Code quality: duplication, complexity, dead code
- Tests: coverage on critical paths
- Documentation: Swagger, CLAUDE.md, .env.example
- Database: schema consistency, migrations, unique constraints

### If Applicable
- Frontend: component reuse, design system compliance, CSS tokens
- ML Service: model versioning, training pipeline, feature engineering
- Docker: image security, layer caching, multi-stage builds
- Git: commit message quality, branch strategy compliance

## Output Format

Audit report must include:

1. **Maturity Score** (0-10)
   - 0-3: Chaotic, many critical issues
   - 4-6: Functional but debt-heavy
   - 7-8: Healthy, some tech debt
   - 9-10: Excellent, minimal debt

2. **Issue Severity Scale**
   - ⛔ Critical: Security, data loss, production down
   - 🔴 High: Major pain point, blocks other work
   - 🟠 Medium: Nice-to-have improvement
   - 🟡 Low: Cosmetic, low impact

3. **Priority Calculation**
   - Impact: 1 (low) to 5 (critical)
   - Effort: 1 (trivial) to 5 (massive)
   - Priority = Impact × (6 - Effort)
   - Higher = more urgent

## Integration with Remediation Plan

Link findings to existing `docs/AUDIT-REMEDIATION-PLAN.md`:
- New issues → add with target date
- Resolved issues → mark ✅ with PR reference
- Evolving issues → update status + notes

## Example Workflow

```bash
User: /code-audit

→ 3 Explore agents in parallel:
  Agent 1: Architecture & structure
  Agent 2: Quality & security
  Agent 3: Tests & documentation

→ 1 Plan agent synthesizes:
  - Consolidates 3 agent findings
  - Deduplicates
  - Assigns severity + priority
  - Generates report

→ Outputs:
  - docs/AUDIT-REPORT-2026-04-18.md
  - Updates docs/AUDIT-REMEDIATION-PLAN.md
```

## Knowledge Sources

Before auditing, review:
- `.claude/CLAUDE.md` — hard rules, code standards
- `.claude/rules/engineering-standards.md` — quality baseline
- `.claude/rules/ai-cognition.md` — code search patterns
- `docs/AUDIT-REMEDIATION-PLAN.md` — prior findings (if any)

## Tips for AI Agents

When conducting this audit:
1. **Anti-hallucination:** Use grep/glob to prove existence before citing
2. **Concrete examples:** Quote actual code lines (file:line)
3. **Reproducibility:** Include commands to detect each issue
4. **Constructive tone:** Pair every problem with a fix recommendation
5. **Context preservation:** Document both the symptom and root cause
