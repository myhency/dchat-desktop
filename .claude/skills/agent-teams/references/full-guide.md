# Agent Teams - Full Reference Guide

## Architecture

### Components

An agent team consists of four key components:

1. **Team Lead**: The primary Claude Code session. Responsible for:
   - Creating the team (`TeamCreate`)
   - Spawning teammates with specific prompts
   - Coordinating work and synthesizing results
   - Cleaning up when done (`TeamDelete`)

2. **Teammates**: Individual Claude Code instances, each with:
   - Own context window (independent of lead)
   - Full project access (CLAUDE.md, MCP servers, skills)
   - Spawn prompt from lead (but NOT lead's conversation history)
   - Ability to claim and complete tasks

3. **Task List**: Shared work repository stored in `~/.claude/tasks/{team-name}/`
   - All agents can see task status
   - Teammates claim available work
   - Dependencies auto-unblock when prerequisites complete

4. **Mailbox**: Message routing system
   - Teammate messages automatically routed to lead
   - Direct messaging between specific agents (`SendMessage`)
   - Broadcast to all teammates (use sparingly)

### Data Storage

| Data | Location |
|------|----------|
| Team config | `~/.claude/teams/{team-name}/config.json` |
| Task list | `~/.claude/tasks/{team-name}/` |
| Team members | `config.json` → `members[]` (name, agentId, agentType) |

## Setup & Configuration

### Environment Variable

```json
// ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Display Modes

| Mode | Config Value | Requirement | Behavior |
|------|-------------|-------------|----------|
| In-process | `"in-process"` | None | All teammates in same terminal, navigate with Shift+Down |
| Split panes | `"split-pane"` | tmux | Each teammate gets own tmux pane |

```json
// ~/.claude/settings.json
{
  "teammateMode": "split-pane"
}
```

**Tmux setup:**
```bash
brew install tmux    # macOS
sudo apt install tmux  # Ubuntu/Debian
```

## Task Management

### Task Lifecycle

```
pending → in_progress → completed
                     ↘ blocked (if dependency not met)
```

### Task Properties

| Property | Description |
|----------|-------------|
| Title | Short description of work item |
| Description | Detailed requirements and success criteria |
| Status | pending, in_progress, completed |
| Assignee | Teammate name (or unassigned) |
| Dependencies | List of task IDs that must complete first |

### Task Tools

| Tool | Purpose | Used by |
|------|---------|---------|
| `TaskCreate` | Create new task with title, description, dependencies | Lead |
| `TaskUpdate` | Update status, add notes | Lead & Teammates |
| `TaskGet` | Get detailed task info | Lead & Teammates |
| `TaskList` | List all tasks with status | Lead & Teammates |

### Dependency Management

- Set dependencies when creating tasks: `dependencies: ["task-id-1", "task-id-2"]`
- Dependent tasks stay `blocked` until all prerequisites are `completed`
- System automatically unblocks tasks when prerequisites complete
- **Avoid circular dependencies** - plan the dependency graph upfront

### Self-Requested Tasks

Teammates can request new tasks by messaging the lead. The lead then decides whether to create the task and assign it.

## Communication Patterns

### Message Types

| Pattern | Tool | When |
|---------|------|------|
| Lead → Teammate | `SendMessage` | Assign work, provide guidance |
| Teammate → Lead | `SendMessage` | Report progress, ask questions |
| Teammate → Teammate | `SendMessage` | Direct coordination |
| Lead → All | Broadcast | Important updates (use sparingly) |
| Automatic | Idle notification | When teammate finishes current task |

### Communication Best Practices

1. **Prefer task list over messages** for status tracking
2. **Use direct messages** for targeted coordination
3. **Minimize broadcasts** - cost scales with team size
4. **Include context in spawn prompts** - history doesn't transfer
5. **Put shared context in CLAUDE.md** - all teammates load it

### Message Routing

- All teammate messages are automatically routed to the lead
- Teammates can discover each other via team config (`members[]` array)
- Lead acts as coordinator, can relay information between teammates

## Teammate Lifecycle

### Spawning

1. Lead creates team via `TeamCreate`
2. Lead sends spawn prompts to create teammates
3. Each teammate starts fresh with:
   - Project context (CLAUDE.md, MCP servers, skills)
   - Spawn prompt from lead
   - Access to shared task list

### During Execution

1. Teammate claims task from shared list
2. Teammate works independently (full tool access)
3. Teammate updates task status as they progress
4. On completion, teammate becomes idle and notifies lead
5. Lead may assign new tasks or teammate claims next available

### Termination

1. Lead calls `TeamDelete` when all work is done
2. Teammates terminate gracefully
3. Team config and task data cleaned up

## Use Case Patterns

### Parallel Feature Development

**When:** Multiple independent features or components to build.

```
Create an agent team:
- "auth": Implement JWT authentication in packages/backend/
- "ui": Build login page in packages/frontend/
- "tests": Write integration tests in packages/backend/src/__tests__/

Tasks:
1. "auth" implements auth service and routes
2. "ui" builds login form and auth state management
3. "tests" writes tests (depends on: auth task)
```

**Key:** Assign non-overlapping file ownership to avoid conflicts.

### Code Review

**When:** Need multiple perspectives on code quality, security, performance.

```
Create a review team:
- "security": Review for OWASP top 10 vulnerabilities
- "performance": Identify performance bottlenecks and N+1 queries
- "architecture": Check hexagonal architecture compliance

Each should review the changes in the last 5 commits and report findings.
```

**Key:** All teammates read-only, no file conflicts possible.

### Debugging / Investigation

**When:** Bug has multiple potential root causes in different areas.

```
Create a debugging team:
- "backend-debug": Investigate SSE connection handling in adapters/
- "frontend-debug": Check reconnection logic in shared/api/
- "infra-debug": Review server configuration and timeouts

Report findings to lead for synthesis.
```

**Key:** Investigation is inherently parallel and non-conflicting.

### Research / Exploration

**When:** Need to explore a problem from multiple angles before implementing.

```
Create a research team:
- "ux": Research UX patterns for chat sidebar navigation
- "tech": Evaluate WebSocket vs SSE for real-time updates
- "competition": Analyze how similar apps handle this feature

Synthesize findings before implementation.
```

**Key:** Pure research, no code changes, ideal for teams.

## Best Practices

### Team Composition

1. **2-5 teammates** - more than 5 becomes hard to coordinate
2. **Clear role boundaries** - each teammate has distinct responsibility
3. **Non-overlapping file ownership** - prevents merge conflicts
4. **Specific spawn prompts** - include all context needed (history doesn't transfer)

### Task Design

1. **Atomic tasks** - one clear deliverable per task
2. **Explicit success criteria** - teammates know when they're done
3. **Minimal dependencies** - maximize parallel execution
4. **Reasonable scope** - not too large (hours) or too small (minutes)

### Coordination

1. **Lead monitors, doesn't micromanage** - trust teammates with their tasks
2. **Use task list as source of truth** - not message history
3. **Synthesize at the end** - lead combines results after all tasks complete
4. **Clean up teams** - always `TeamDelete` when done

### D Chat Desktop Specific

Given the monorepo structure (`packages/shared`, `packages/backend`, `packages/frontend`, `packages/electron`):

1. **Package-based assignment** - assign one teammate per package
2. **Shared types first** - if types need updating, complete that task before dependent work
3. **Backend tests required** - remind backend teammates to include tests (`packages/backend/src/__tests__/`)
4. **E2E tests** - assign a dedicated teammate for `e2e/` tests if UI changes involved
5. **Respect hexagonal architecture** - domain has zero external dependencies

## Troubleshooting

### Team won't create

| Symptom | Check |
|---------|-------|
| "Teams not enabled" | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings |
| No response to team prompt | Restart Claude Code after changing settings |
| TeamCreate fails | Check `~/.claude/teams/` directory permissions |

### Teammate issues

| Symptom | Check |
|---------|-------|
| Teammate stuck on wrong task | Send direct message with corrected instructions |
| Teammate can't find files | Verify working directory and file paths in spawn prompt |
| Teammate missing context | Add key info to spawn prompt (history doesn't transfer) |
| Teammate idle but tasks remain | Check task dependencies - may be blocked |

### Communication issues

| Symptom | Check |
|---------|-------|
| Messages not delivered | Verify teammate name matches exactly |
| Broadcast too expensive | Switch to targeted `SendMessage` |
| Lead overwhelmed by messages | Set clear reporting cadence in spawn prompts |

### File conflicts

| Symptom | Solution |
|---------|----------|
| Git merge conflicts | Assign non-overlapping file ownership upfront |
| Overwritten changes | Use git branches per teammate if needed |
| Inconsistent state | Have lead review and integrate changes sequentially |

## Hooks Integration

Agent teams support hooks for automation:

### Available Team Events

| Event | Trigger | Use case |
|-------|---------|----------|
| `TeammateIdle` | Teammate finishes current task | Auto-assign next task, notify lead |
| `TaskCompleted` | Task status → completed | Trigger dependent tasks, run CI |

### Example Hook Configuration

```json
// .claude/settings.json
{
  "hooks": {
    "TeammateIdle": {
      "command": "echo 'Teammate idle: $TEAMMATE_NAME'"
    },
    "TaskCompleted": {
      "command": "echo 'Task completed: $TASK_ID'"
    }
  }
}
```

Hooks run in the lead's context. Use them for:
- Automated CI triggers when tasks complete
- Slack/notification integration
- Logging and monitoring
- Auto-cleanup of completed teammate resources
