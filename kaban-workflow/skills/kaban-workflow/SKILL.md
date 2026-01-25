---
name: kaban-workflow
description: Use when calling TodoWrite with 3+ items, starting multi-step tasks, or when user mentions "board", "kanban", "track progress". Syncs TodoWrite with persistent Kaban board.
---

# Kaban Workflow

Persistent Kanban board for AI agent coordination. Tasks survive sessions and sync with TodoWrite.

**Core principle:** TodoWrite for session visibility, Kaban for persistence.

## When to Activate

- Multi-step features (3+ tasks)
- User says "plan", "track", "board", "kanban"
- Session start with existing board
- Delegating to sub-agents

**Not for:** Single tasks, pure research, throwaway work.

## Availability

### MCP Tools (Preferred)

```
kaban_status                      - board status
kaban_list_tasks(assignee?)       - list tasks (filter by assignee)
kaban_add_task                    - add task
kaban_update_task(assignedTo?)    - update task / assign
kaban_move_task                   - move between columns
kaban_complete_task               - mark done
```

### CLI Fallback

```bash
which kaban                        # check installation
kaban status                       # board status
kaban list                         # list tasks
kaban list --assignee <agent>      # list MY tasks
kaban add "title"                  # add task
kaban assign <id> <agent>          # assign task to agent
kaban move <id> <col> --assign     # move and claim task
kaban done <id>                    # complete task
```

**Install:** `npm i -g @kaban-board/cli` or `brew install beshkenadze/tap/kaban`

### Never Do

- Check `.kaban/board.db` directly
- Run source code (`bun run`, `npx ts-node`)

## Task Sync

| Action | TodoWrite | Kaban |
|--------|-----------|-------|
| Create | `todowrite` | `kaban_add_task` |
| Assign | - | `kaban assign <id> <agent>` |
| Start | `status: in_progress` | `kaban move <id> in-progress --assign` |
| Complete | `status: completed` | `kaban_complete_task` |

Always mirror changes to both systems.

## Session Start

```
1. kaban_status (or kaban status)
   ├─ No board → proceed normally
   └─ Board exists → check in-progress tasks
      └─ Ask: "Resume [task]?"
```

## Sub-Agent Delegation

```
1. kaban assign <id> <agent-name>   # Assign task to sub-agent
2. Task tool prompt includes:
   - Kaban task ID
   - Agent name for --assignee filter
3. Sub-agent workflow:
   - kaban list --assignee <agent-name>  # See MY tasks
   - kaban move <id> in-progress --assign <agent-name>
   - kaban done <id>                     # When complete
```

## Columns

| Column | WIP Limit |
|--------|-----------|
| Backlog | - |
| To Do | - |
| In Progress | 3 |
| Done | - |

## Labels

| Type | Examples |
|------|----------|
| Type | `bug`, `feature`, `refactor` |
| Priority | `p0`, `p1`, `p2`, `p3` |
| Domain | `frontend`, `backend`, `infra` |

## Quick Reference

### CLI Commands

| Command | Description |
|---------|-------------|
| `kaban init` | Initialize board |
| `kaban status` | Board summary |
| `kaban add "title"` | Add task |
| `kaban list` | List tasks |
| `kaban list --assignee <agent>` | List agent's tasks |
| `kaban assign <id> <agent>` | Assign task |
| `kaban assign <id> --clear` | Unassign task |
| `kaban move <id> <col>` | Move task |
| `kaban move <id> <col> -A [agent]` | Move and assign |
| `kaban done <id>` | Complete task |
| `kaban archive` | Archive done tasks |
| `kaban restore <id>` | Restore from archive |

### MCP Tools

| Tool | Key Parameters |
|------|----------------|
| `kaban_add_task` | title, column?, labels? |
| `kaban_move_task` | id, column |
| `kaban_update_task` | id, assignedTo?, labels? |
| `kaban_complete_task` | id |
| `kaban_list_tasks` | columnId?, assignee?, blocked? |
| `kaban_status` | - |
| `kaban_archive_tasks` | - |
| `kaban_restore_task` | id |

## Rules

1. Always sync TodoWrite ↔ Kaban
2. Include task ID when delegating
3. Respect WIP limits (ask before forcing)
4. Use CLI or MCP tools only (never direct DB access)
