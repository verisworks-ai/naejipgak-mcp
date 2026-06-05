# Security Policy

## Supported versions

Security updates are accepted for the current `main` branch and latest npm release.

## Reporting a vulnerability

Please open a private GitHub security advisory or contact the maintainers through the repository owner.

## Data and privacy posture

- This MCP server runs locally over stdio.
- It does not collect telemetry.
- Default mode does not call external APIs.
- It does not require secrets, login sessions, or hosted infrastructure.
- Users may optionally set `KOSIS_API_KEY` and `KOSIS_USER_STATS_ID` locally to mark a user-owned KOSIS OpenAPI basis for their own workflow.
- Optional API keys are read from local environment variables only; key values are never included in MCP responses.
- Applicant inputs are processed in memory and returned to the MCP client only.

## Scope

- This package provides decision-support calculations and advisory pre-checks only. Incorrect legal/financial advice claims should be reported as rule/data issues, but final official eligibility always belongs to the latest announcement and reviewing institution.
