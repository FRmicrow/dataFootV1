# US-2101: Backend - S3 Strategy & Base Infrastructure (PRIORITY)

**Role**: Backend Engineer / DevOps
**Objective**: Implement the S3 storage strategy before any other development.

## Tasks
- Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- Set up S3 configuration in `.env` and `.env.example`.
- Implement `S3Service` with `uploadFile` and `getSignedUrl` methods.
- Create a migration for the `GeneratedContent` table.
- Implement the `GeneratedContent` model/repository in the backend.

## Technical Requirements
- Table `GeneratedContent`: `id`, `title`, `chart_type`, `league_id`, `season`, `format`, `s3_key`, `status` (PENDING, PROCESSING, SUCCESS, FAILED), `error_message`, `metadata` (JSON), `created_at`, `updated_at`.
- S3 Client: Use `@aws-sdk/client-s3`.

## Acceptance Criteria
- [ ] Migration applied successfully.
- [ ] Table `GeneratedContent` exists in PostgreSQL.
- [ ] S3 upload utility can successfully upload a test file.
- [ ] Pre-signed URLs are correctly generated for private asset access.
