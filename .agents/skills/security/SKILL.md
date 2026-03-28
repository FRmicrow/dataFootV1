---
name: security
description: Security audits and vulnerability remediation. Use when auditing code for SQL injection, XSS, or handling sensitive data.
---

# Security Skill

This skill provides expertise in ensuring the safety and integrity of the `statFootV3` project.

## When to use
Use this skill for:
- Auditing code for common vulnerabilities (OWASP Top 10).
- Hardening the application against SQL injection and XSS.
- Managing sensitive data and secrets (using `.env`).
- Implementing secure authentication and session management.
- Ensuring secure communication (HTTPS, CSP).

## Hard Rules (CRITICAL)
- **Secrets**: NEVER commit secrets (passwords, API keys) to version control. Use environmental variables.
- **SQLi**: ALWAYS use parameterized queries. No exceptions.
- **XSS**: Sanitize all user-inputted data before rendering it in the UI.
- **CSRF**: Implement CSRF protection for all mutating requests (POST, PUT, DELETE).
- **Headers**: Use `helmet` or similar middleware to set secure HTTP headers.

## Best Practices
1. **Sanitization**: Use libraries like `DOMPurify` (frontend) and `validator` (backend) to sanitize input.
2. **Rate Limiting**: Implement rate limiting on sensitive endpoints (login, forgot password).
3. **Audit**: Regularly run dependency audits (`npm audit`) and update vulnerable packages.
4. **Least Privilege**: Ensure the database user has only the necessary permissions.

## Integration
- Works with the `backend` skill to implement secure logic.
- Works with the `devops` skill to ensure secure deployments.
- Supports the `web-dev` skill by providing secure UI patterns.
