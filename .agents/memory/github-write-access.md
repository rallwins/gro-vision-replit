---
name: GitHub write access
description: Replit's GitHub source-control connection and the credential used by local Git commands may not have the same write access.
---

A successful repository read or account-level push permission does not prove the credential used by `git` or `gh` can write. If a private-repository write returns 403, check the integration lifecycle and active credential path; do not try multiple API routes to bypass the denial.

**Why:** A private repository reported push permission for the account, while the workspace's GitHub CLI and REST writes were still denied. The connection status also remained `not_added` after `addIntegration` reported success.

**How to apply:** Use the exact integration status and ID, bind a `not_added` connection once, then retry the write once. If it still fails, follow the reauthorization flow only when the connection is `added` and OAuth is reported; otherwise stop and ask the user to update the existing connection's write permissions. Never request or expose tokens.
