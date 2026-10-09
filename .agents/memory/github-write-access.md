---
name: GitHub write access
description: Replit's GitHub source-control connection and the credential used by local Git commands may not have the same write access.
---

A successful repository read or account-level push permission does not prove the credential used by `git` or `gh` can write. If a private-repository write returns 403, check the integration lifecycle and active credential path; do not try multiple API routes to bypass the denial.

The GitHub source-control connection can report `addIntegration` success and “already added” while integration search still shows `not_added`; a reauthorization request may then be rejected as not connected. Treat this as unresolved access, not as a reason to try another credential or API route.

**Why:** Private-repository writes can be denied even when account-level access and OAuth scopes look sufficient, and the connection lifecycle can return conflicting states.

**How to apply:** Use the exact integration status and ID, bind a `not_added` connection once, then retry the write once. If it still fails and reauthorization is unavailable because the connection is not recognized as connected, stop and ask the user to update the existing connection's repository write access. Never request or expose tokens.
