---
name: agent-teams
description: Use when orchestrating multiple Claude Code instances as a team for parallel work - creating teams, assigning tasks, coordinating teammates, or when user mentions agent teams, TeamCreate, or multi-agent coordination
---

# Agent Teams

## When to Use

- **Teams**: Independent, long-running parallel work (e.g., 3 devs on 3 features)
- **Subagents** (Agent tool): Short subtasks within main flow (e.g., research while coding)

## Prerequisites

1. Enable in `~/.claude/settings.json`:
```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```
2. (Optional) Install tmux + set `"teammateMode": "split-pane"` for per-teammate panes

## Team Creation

Tell Claude what team you want with specific roles and tasks:

```
Create an agent team with 3 teammates:
1. "frontend" - Implement the new chat sidebar in packages/frontend/src/widgets/
2. "backend" - Add the sidebar API endpoints in packages/backend/src/adapters/inbound/http/
3. "tests" - Write E2E tests in e2e/ for the sidebar feature
```

## Core Tools

| Tool | Purpose |
|------|---------|
| `TeamCreate` | Create team with teammates |
| `TaskCreate` / `TaskUpdate` / `TaskList` / `TaskGet` | Manage shared task list |
| `SendMessage` | Direct message to specific teammate |
| `TeamDelete` | Clean up team when done |

## Key Principles

- **2-5 teammates**, each with non-overlapping file ownership
- Write **clear completion criteria** for every task
- Prefer `SendMessage` over broadcast (broadcast scales O(n))
- **Always `TeamDelete`** when work is complete
- Put shared context in CLAUDE.md (teammates load it automatically)

## Detailed Reference

For setup options, coordination patterns, monitoring, pitfalls, and limitations, see `references/full-guide.md`.
