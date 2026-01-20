# Kaban Development Guide

## Release Process

Releases are **fully automated** via [release-please](https://github.com/googleapis/release-please).

### Standard Release Flow

```
Push to main → release-please creates PR → Merge PR → Auto-publish
```

1. Push conventional commits to `main` branch
2. release-please auto-creates a "Release PR" with:
   - Bumped versions in all `package.json` files
   - Updated `CHANGELOG.md`
   - Git tag preparation
3. Review and merge the Release PR
4. Auto-publishes: npm packages, GitHub Release, Homebrew formula

### Manual Release (Emergency)

For urgent releases outside the normal flow:

1. Go to **Actions** → **Manual Release**
2. Click **Run workflow**
3. Enter version (e.g., `0.2.1`)
4. Optionally skip tests
5. Click **Run**

### Commit Types & Version Impact

| Type | Version Bump | Example |
|------|--------------|---------|
| `feat:` | Minor (0.2.0 → 0.3.0) | `feat: add dark mode` |
| `fix:` | Patch (0.2.0 → 0.2.1) | `fix: resolve crash` |
| `perf:` | Patch | `perf: optimize queries` |
| `feat!:` | Major (0.2.0 → 1.0.0) | `feat!: redesign API` |
| `docs:` | No bump | `docs: update README` |
| `chore:` | No bump | `chore: update deps` |
| `refactor:` | No bump | `refactor: extract utils` |

## Development

```bash
bun install        # Install dependencies
bun run build      # Build all packages
bun run test       # Run tests
bun run lint       # Lint code
bun run check      # Biome check (lint + format)
```

## Project Structure

```
packages/
├── core/     # Database, services, schemas
├── cli/      # CLI commands and MCP server
└── tui/      # Terminal UI (compiled to standalone binary)
```

## Code Style

- TypeScript strict mode
- Biome for linting/formatting
- No `any` types
- Run `bun run check` before committing
