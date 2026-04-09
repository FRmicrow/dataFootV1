# Development Best Practices (V2)

Technical standards for statFootV3. These are enforced — not suggestions.

## 1. Design System V3 (ABSOLUTE RULE)

**Check before creating:** Before writing any JSX style, run:
```bash
ls frontend/src/design-system/components/
```
If a component exists, use it. Do not recreate it.

**Use tokens, not values:** Every color, spacing, radius, shadow, and z-index must reference a CSS variable from `tokens.css`. See `frontend-design-v2/references/design-tokens.md` for the full list.

**New reusable components go in the design system.** If a component will be used in more than one page, create it in `frontend/src/design-system/components/`, not inline in a page.

## 2. Code Quality

**Atomic functions:** Break logic into pure, testable functions. No function longer than 50 lines without a documented reason.

**React performance:** Never run sort/filter/aggregate inside a render. Use `useMemo` for derived data. Use `useCallback` for functions passed as props.

**No dead code:** Remove unused imports, variables, and commented-out blocks before committing. SonarQube will flag them.

**Error states are mandatory:** Every component that fetches data must handle three states:
1. Loading → `<Skeleton>`
2. Error → visible error message, not a blank screen
3. Success → the actual content

## 3. Backend Quality

**Parameterized queries only.** Never build SQL strings with string concatenation or template literals that include user input. The `db.all(sql, params)` interface is parameterized — use it.

**Service layer owns business logic.** Controllers validate input (via Zod) and call services. Services do the work. No business logic in controllers.

**Standard response wrapper:**
```js
// Success
res.json({ success: true, data: result });

// Error
res.status(400).json({ success: false, error: 'Descriptive message' });
```

## 4. Testing (QA Gate — Mandatory)

Every feature ships with:
- **Unit Tests (TU):** Logic functions tested in isolation
- **API Contract Tests:** Endpoint shapes verified against Zod schemas
- **Non-Regression (TNR):** Full suite passes before merge

Use the `qa-automation-v2` skill for the full process.

## 5. Documentation

- API endpoint changes → update `backend-swagger.yaml`
- New design system components → add to `frontend/src/design-system/` with a `.stories.jsx` story
- New features → create `docs/features/Vxx-[Name]/` with at minimum `technical-spec.md` and `QA-REPORT.md`
