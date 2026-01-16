# Project Index: Kaban

Generated: 2026-01-16

## Overview

Terminal-based Kanban board for AI code agents and developers. Provides task management, progress tracking, and AI agent coordination via CLI, TUI, and MCP server.

## Project Structure

```
KabanProject/
├── packages/
│   ├── core/          # Database, services, schemas, validation
│   ├── cli/           # Unified CLI (includes mcp, tui subcommands)
│   └── tui/           # Terminal UI with @opentui/core
├── docs/              # Specifications and plans
├── Taskfile.yml       # Build/install automation
└── biome.json         # Linting/formatting config
```

## Entry Points

| Command | Path | Description |
|---------|------|-------------|
| `kaban` | `packages/cli/src/index.ts` | Unified CLI entry |
| `kaban mcp` | `packages/cli/src/commands/mcp.ts` | MCP server for AI agents |
| `kaban tui` | `packages/cli/src/commands/tui.ts` | Interactive terminal UI |

## Core Package (@kaban/core)

**Path**: `packages/core/src/`

### Database Schema (`db/schema.ts`)
- `boards` - Board metadata (id, name, timestamps)
- `columns` - Kanban columns (id, name, position, wipLimit, isTerminal)
- `tasks` - Task records (id, title, description, columnId, position, createdBy, assignedTo, dependsOn, files, labels, blockedReason, version, timestamps)
- `undoLog` - Operation history for undo

### Services
| Service | Methods |
|---------|---------|
| `BoardService` | initializeBoard, getBoard, getColumns, getColumn, getTerminalColumn |
| `TaskService` | addTask, getTask, listTasks, updateTask, moveTask, deleteTask |

### Exports
- Schemas: `TaskSchema`, `ColumnSchema`, `BoardSchema`, `ConfigSchema`, `AddTaskInputSchema`, etc.
- Types: `Task`, `Column`, `Board`, `Config`, `AddTaskInput`, `UpdateTaskInput`, `MoveTaskInput`
- Utilities: `createDb`, `initializeSchema`, `validateTitle`, `validateAgentName`, `validateColumnId`
- Constants: `DEFAULT_CONFIG`, `ExitCode`, `KabanError`

### Dependencies
- `@libsql/client` - SQLite database
- `drizzle-orm` - ORM
- `zod` - Schema validation
- `ulid` - ID generation

## CLI Package (@kaban/cli)

**Path**: `packages/cli/src/`

### Commands
| Command | File | Description |
|---------|------|-------------|
| `init` | `commands/init.ts` | Initialize board in directory |
| `add` | `commands/add.ts` | Add new task (with description support) |
| `list` | `commands/list.ts` | List tasks with filters, sorting, assignee |
| `move` | `commands/move.ts` | Move task to column |
| `done` | `commands/done.ts` | Mark task complete |
| `status` | `commands/status.ts` | Board status summary |
| `schema` | `commands/schema.ts` | Output JSON schemas |
| `mcp` | `commands/mcp.ts` | Start MCP server |
| `tui` | `commands/tui.ts` | Launch TUI |

### CLI Features
- **Sorting**: `--sort name|date|updated` with `--reverse`
- **Filtering**: `--column`, `--agent`, `--assignee`, `--blocked`
- **Description**: `--description` on add, truncated display in list

### MCP Tools (via `kaban mcp`)
- `kaban_init`, `kaban_add_task`, `kaban_get_task`, `kaban_list_tasks`
- `kaban_move_task`, `kaban_update_task`, `kaban_delete_task`
- `kaban_complete_task`, `kaban_status`

### MCP Resources
- `kaban://board/status`, `kaban://board/columns`
- `kaban://tasks/{columnId}`, `kaban://task/{id}`

## TUI Package (@kaban/tui)

**Path**: `packages/tui/src/`

### Components
- `components/board.ts` - Main board view
- `components/overlay.ts` - Modal overlay system
- `components/modals/` - add-task, move-task, delete-task, assign-task, help, quit, onboarding

### Libraries
- `lib/keybindings.ts` - Keyboard shortcuts
- `lib/button-row.ts` - Button row component
- `lib/form.ts` - Form utilities
- `lib/theme.ts` - Color theme
- `lib/project.ts` - Project discovery
- `lib/types.ts` - TUI-specific types

### Keybindings
| Key | Action |
|-----|--------|
| `h/l`, `←/→` | Navigate columns |
| `j/k`, `↑/↓` | Navigate tasks |
| `a` | Add task |
| `m` | Move task |
| `d` | Delete task |
| `u` | Assign user |
| `?` | Help |
| `q` | Quit |

## Configuration

### Files
| File | Purpose |
|------|---------|
| `biome.json` | Linting and formatting |
| `tsconfig.json` | TypeScript config (base) |
| `bunfig.toml` | Bun runtime config |
| `Taskfile.yml` | Build/install tasks |

### Environment Variables
- `KABAN_PATH` - Board directory (default: cwd)
- `KABAN_AGENT` - Default agent name (default: "user")

### Data Storage
- `.kaban/board.db` - SQLite database
- `.kaban/config.json` - Board configuration

### Default Columns
1. Backlog
2. To Do
3. In Progress (WIP: 3)
4. Done (terminal)

## Test Coverage

| Package | Files | Focus |
|---------|-------|-------|
| core | 3 | validation, board service, task service |
| cli | 1 | CLI integration |

## Quick Start

```bash
# Install
git clone <repo> && cd KabanProject
task install

# Initialize board
kaban init --name "My Board"

# Add tasks
kaban add "Implement feature" -c todo -D "Detailed description here"
kaban add "Fix bug" -c todo -a claude

# List and filter
kaban list --sort name
kaban list --assignee claude --column in-progress

# Move and complete
kaban move abc123 in-progress
kaban done abc123

# Launch TUI
kaban tui

# Start MCP server (for AI agents)
kaban mcp
```

## Architecture Notes

- **No compiled binaries**: Uses wrapper script due to libsql native module incompatibility with `bun build --compile`
- **Monorepo**: Bun workspaces with `packages/*`
- **Type-safe**: Zod schemas + TypeScript
- **Optimistic locking**: Tasks have version field for concurrent updates
- **WIP limits**: Columns can enforce work-in-progress limits
