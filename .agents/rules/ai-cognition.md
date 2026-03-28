# AI Cognition & Context (V2)

Rules for precise, grounded agent behavior in statFootV3.

## 1. Context Management

**Impact Analysis First:** Before any action, list the files that will be modified and read their current content. Never assume what a file contains.

**Targeted Reading:** Do not read large files in their entirety when a search would suffice. Use `grep` to locate the specific function or block before reading.

**Dependency Tracing:** When modifying a service, check which controllers import it. When modifying a component, check which pages use it.
```bash
grep -rn "ServiceName" backend/src/
grep -rn "ComponentName" frontend/src/
```

## 2. Anti-Hallucination

**Prove by Code:** Never assume a function, method, or prop exists. Find it with grep before referencing it.

```bash
# Before calling a service method:
grep -n "methodName" backend/src/services/v3/ServiceName.js

# Before using a design system component:
ls frontend/src/design-system/components/
```

**No Invented APIs:** If unsure of an endpoint's path or shape, read `backend/src/routes/v3/` to confirm. Do not guess.

**Verify DB Schema:** If writing SQL or using a model field, confirm the column exists in `backend/src/migrations/` or in the relevant repository file before writing the query.

## 3. Build Failure Protocol

If a build or test command fails:
1. Read the full error — do not skim
2. Identify the root cause (not the symptom)
3. Propose one fix, apply it, re-run
4. If the same error repeats after 2 attempts, stop and explain the blocker

Do not guess-fix by trying random changes in a loop.

## 4. Scope Control

Only touch files directly related to the current task. If an unrelated bug is noticed:
- Note it: `// AUDIT: [description]`
- Do not fix it in the same commit
- Report it after the main task is done

## 5. Chain-of-Thought for Complex Tasks

For tasks involving more than 3 files or an architectural decision:
1. State the goal in one sentence
2. List the files that will be touched
3. Describe the approach in 3–5 bullet points
4. Confirm with the user before proceeding

## 6. Feedback Loop

If a user rejects an approach, document why before proposing an alternative:
- "The previous approach failed because [reason]."
- "The new approach addresses this by [change]."

This prevents repeating the same mistake in the same conversation.
