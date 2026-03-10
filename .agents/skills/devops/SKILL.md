---
name: devops
description: Helps with deployment, Docker, docker-compose, and CI/CD. Use when building images, managing infrastructure, or troubleshooting deployment pipelines.
---

# DevOps Skill

This skill manages the infrastructure and delivery pipeline of `statFootV3`.

## When to use this skill

- Use this when editing `Dockerfile` or `docker-compose.yml`.
- This is helpful for setting up or debugging GitHub Actions.
- Use when optimizing build times or container security.
- Use for deploying services to staging or production environments.

## How to use it

### Docker Standards
- Use **multi-stage builds** to minimize image size.
- Prefer **Alpine** or **Distroless** base images.
- Ensure all services are compatible with `local` and `production` environments via `.env`.

### CI/CD
- GitHub Actions for automated testing on every PR.
- Automated linting and security scanning (SonarQube).

### Infrastructure
- `docker-compose up` is the preferred way to run the full stack locally.
- Use persistent volumes for PostgreSQL data.
