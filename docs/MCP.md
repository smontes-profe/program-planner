# Program Planner - MCP Recommendations

## 1. Goal

Use MCP servers to speed up development, keep context fresh, and reduce manual operations for agents.

## 2. Recommended MCP Servers

### 2.1 PostgreSQL / Supabase MCP

Primary use cases:

- Inspect schema and constraints.
- Validate query plans.
- Run safe read-only diagnostics.
- Assist migration review.

Why:

- This project is data-model heavy (`RA/CE/UT/instruments/grades`), so direct database introspection is high value.

### 2.2 GitHub MCP

Primary use cases:

- Read PR context and CI status.
- Review changed files and comments.
- Coordinate task execution from issues.

Why:

- Supports the workflow where agents pick tasks and report execution status.

### 2.3 Vercel MCP (if available in your environment)

Primary use cases:

- Check deployment status.
- Inspect preview links and logs.
- Validate environment mapping per branch.

Why:

- Faster feedback loop during CI/CD operations.

### 2.4 Docs MCP (optional)

Primary use cases:

- Query internal architecture/spec docs.
- Keep implementation aligned with documented behavior.

Why:

- Helps agents avoid drifting from `docs/` contracts.

## 3. Safety Rules for MCP Usage

- Never run destructive DB commands without explicit approval.
- Prefer read-only commands unless migration work is in scope.
- Log assumptions in PR notes when automated context is partial.

## 4. Suggested Priority Order

1. PostgreSQL/Supabase MCP
2. GitHub MCP
3. Vercel MCP
4. Optional documentation MCP

## 5. Minimum Operational Setup

- Ensure MCP auth tokens are scoped with least privilege.
- Separate credentials for development and production.
- Rotate secrets periodically.
