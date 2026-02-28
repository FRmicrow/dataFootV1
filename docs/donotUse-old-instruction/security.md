---
trigger: always_on
---

Development Guideline: Security
Overview

Security is essential to protect sensitive data, comply with regulations and maintain user trust. This guideline outlines best practices for securing the dataFootV1 platform.

Input Validation & Sanitisation

Validate all inputs on both the client and server. Define schemas for request bodies and query parameters and enforce them strictly.

Sanitise inputs to guard against SQL injection, cross‑site scripting (XSS) and other injection attacks. Use parameterised queries or prepared statements for all database operations.

Authentication & Authorisation

Implement secure authentication mechanisms such as JWT or OAuth. Protect tokens from interception by using HTTPS and secure storage.

Enforce authorisation checks on every protected endpoint. Apply role‑based or permission‑based access control to limit what users can do based on their roles.

Secret Management

Store secrets (API keys, passwords, tokens) in environment variables or dedicated secret stores. Do not commit secrets to version control.

Rotate credentials periodically and revoke unused keys promptly.

Dependency & Vulnerability Management

Keep dependencies up to date. Use tools like npm audit or yarn audit to detect known vulnerabilities and apply patches.

Avoid unnecessary dependencies to reduce the attack surface. Review third‑party libraries for trustworthiness and community support.

Transport Security

Use HTTPS for all communication between clients and servers to encrypt data in transit.

Configure HTTP security headers (e.g., Content‑Security‑Policy, X‑Content‑Type‑Options, Strict‑Transport‑Security) to mitigate common web vulnerabilities.