<p align="center">
  <img src="docs/assets/icon.png" alt="Kaban" width="120" height="120">
</p>

<h1 align="center">Kaban</h1>

<p align="center">
  <strong>Kanban for AI Agents</strong><br>
  Track and coordinate tasks between humans and AI in the terminal
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#mcp-integration">MCP Integration</a> •
  <a href="#cli-usage">CLI</a> •
  <a href="#tui-usage">TUI</a> •
  <a href="#ai-code-editors">AI Editors</a>
</p>

---

## What is Kaban?

Kaban is a terminal-based Kanban board designed for **AI code agents** and developers. It provides a structured way to manage tasks, track progress, and coordinate between human users and AI agents.

**Why Kaban?**

- **Manage Todos** — Track tasks with a proper Kanban board
- **Assign to Agents** — Assign tasks to Claude, GPT, or any AI agent
- **Single App** — No servers, no cloud. One SQLite file. Works offline
- **TUI + CLI + MCP** — Interactive UI for humans, CLI for scripts, MCP for AI

## Features

| Feature | Description |
|---------|-------------|
| **MCP Server** | AI agents can read, create, and manage tasks autonomously |
| **Interactive TUI** | Vim-style navigation, keyboard-driven workflow |
| **Powerful CLI** | Scriptable commands for automation |
| **WIP Limits** | Built-in Kanban best practices |
| **Agent Tracking** | See who (human or AI) owns each task |
| **Portable** | Single SQLite file, no server required |

## Installation

### npx / bunx (Zero Install)

```bash
# Try without installing
npx @kaban-board/cli init --name "My Project"
npx @kaban-board/cli tui

# Or with bun
bunx @kaban-board/cli tui
```

### npm (Global Install)

```bash
npm install -g @kaban-board/cli
kaban init --name "My Project"
kaban tui
```

### Homebrew (macOS / Linux)

```bash
brew tap beshkenadze/tap
brew install kaban
kaban tui
```

### From Source

```bash
git clone https://github.com/beshkenadze/kaban
cd kaban && bun install && bun run build
task install
```

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ or [Bun](https://bun.sh/) v1.0+
- [Task](https://taskfile.dev/) (optional, for development)

## Packages

Kaban is a monorepo with three packages:

| Package | Description |
|---------|-------------|
| `@kaban-board/core` | Database logic, services, and schemas |
| `@kaban-board/cli` | CLI commands, TUI launcher, MCP server |
| `@kaban-board/tui` | Interactive Terminal User Interface |

## MCP Integration

Connect your AI coding assistant to Kaban via [Model Context Protocol](https://modelcontextprotocol.io/).

### Claude Desktop Setup

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kaban": {
      "command": "npx",
      "args": ["-y", "@kaban-board/cli", "mcp"],
      "env": {
        "KABAN_PATH": "/path/to/your/project"
      }
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "kaban": {
      "command": "kaban",
      "args": ["mcp"],
      "env": {
        "KABAN_PATH": "/path/to/your/project"
      }
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `kaban_init` | Initialize a new board |
| `kaban_add_task` | Add a task |
| `kaban_get_task` | Get task details |
| `kaban_list_tasks` | List tasks with filters |
| `kaban_move_task` | Move task to column |
| `kaban_update_task` | Update task properties |
| `kaban_delete_task` | Delete a task |
| `kaban_complete_task` | Mark task as done |
| `kaban_status` | Get board summary |

### MCP Resources

| Resource | Description |
|----------|-------------|
| `kaban://board/status` | Board status with counts |
| `kaban://board/columns` | Available columns |
| `kaban://tasks/{columnId}` | Tasks in a column |
| `kaban://task/{id}` | Single task details |

## CLI Usage

```bash
kaban <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `kaban init` | Initialize a board |
| `kaban add <title>` | Add a task |
| `kaban list` | List tasks |
| `kaban move <id> [column]` | Move a task |
| `kaban done <id>` | Mark task complete |
| `kaban status` | Show board summary |
| `kaban tui` | Launch interactive UI |
| `kaban mcp` | Start MCP server |

### Examples

```bash
# Initialize with custom name
kaban init --name "Sprint 1"

# Add task with metadata
kaban add "Fix auth bug" -c todo -a claude -D "OAuth2 flow broken"

# List tasks in a column
kaban list --column in-progress

# Move task to next column
kaban move abc123 --next

# Mark complete
kaban done abc123
```

## TUI Usage

Launch the interactive terminal UI:

```bash
kaban tui
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `<` `>` / `h` `l` | Navigate columns |
| `^` `v` / `j` `k` | Navigate tasks |
| `Enter` | View task details |
| `a` | Add new task |
| `e` | Edit task |
| `m` | Move task |
| `u` | Assign user/agent |
| `d` | Delete task |
| `?` | Show help |
| `q` | Quit |

## AI Code Editors

Add Kaban MCP server to your AI coding assistant:

### Claude Code / Claude Desktop

Add to `.mcp.json` (Claude Code) or `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kaban": {
      "command": "npx",
      "args": ["-y", "@kaban-board/cli", "mcp"]
    }
  }
}
```

### OpenCode

Add to `opencode.json`:

```json
{
  "mcp": {
    "kaban": {
      "command": "npx",
      "args": ["-y", "@kaban-board/cli", "mcp"]
    }
  }
}
```

### Cursor / Windsurf / Continue

Add to MCP settings:

```json
{
  "mcpServers": {
    "kaban": {
      "command": "npx",
      "args": ["-y", "@kaban-board/cli", "mcp"]
    }
  }
}
```

### With Global Install

If you installed globally (`npm i -g @kaban-board/cli`), use:

```json
{
  "mcpServers": {
    "kaban": {
      "command": "kaban",
      "args": ["mcp"]
    }
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KABAN_PATH` | Board data directory | Current directory |
| `KABAN_AGENT` | Default agent name | `user` |

### Data Storage

Kaban stores data in `.kaban/` directory:

```
.kaban/
├── board.db      # SQLite database
└── config.json   # Board configuration
```

### Default Columns

| Column | WIP Limit |
|--------|-----------|
| Backlog | — |
| To Do | — |
| In Progress | 3 |
| Review | 2 |
| Done | — (terminal) |

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Development
bun install
bun run build
bun run lint
bun run test
```

## License

[MIT](LICENSE)
