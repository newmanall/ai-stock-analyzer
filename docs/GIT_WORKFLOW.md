# Git Workflow for AI-Assisted Development

This document defines the git workflow for this project, optimized for AI-assisted development with clear commit messages and development tracking.

---

## Branch Strategy

```
main          - Production-ready code (protected)
  ↑
dev           - Integration branch for features
  ↑
feature/*     - Individual feature branches
bugfix/*      - Bug fix branches
```

### For AI-Assisted Development

Since AI typically works in the current session, we use a simplified workflow:

1. **Small changes**: Commit directly to `main` with descriptive messages
2. **Major features**: Create a `feature/description` branch, merge to `main` after review
3. **AI sessions**: Each AI session's work is tracked in `DEVELOPMENT_LOG.md`

---

## Commit Message Format

```
type(scope): subject

- Detail 1
- Detail 2
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding/modifying tests |
| `chore` | Build, config, tooling |

### Scopes

| Scope | Description |
|-------|-------------|
| `api` | API endpoints, routes |
| `client` | Frontend components |
| `server` | Backend logic |
| `ai` | AI/LLM integration |
| `db` | Database, migrations |
| `deploy` | Deployment config |
| `config` | Configuration files |

---

## Workflow

### Initial Setup

```bash
# 1. Initialize git
git init

# 2. Configure user (use your info)
git config user.name "Your Name"
git config user.email "your@email.com"

# 3. Create initial commit
git add .
git commit -m "chore(init): initial project setup"

# 4. Create GitHub repository and push
gh repo create ai-stock-dashboard-railway --public --source=. --push
```

### During Development

```bash
# Check status
git status

# Stage changes
git add <file>           # Specific file
git add .                # All changes

# Commit with AI-generated message
git commit -m "type(scope): subject

- Change 1
- Change 2"

# Push to remote
git push origin main
```

### Review Before Commit

```bash
# See what will be committed
git diff --cached

# See all changes
git diff
```

---

## AI Session Handoff

When switching between AI sessions or resuming work:

1. **Commit pending changes** - Never leave uncommitted work
2. **Update DEVELOPMENT_LOG.md** - Record what was done
3. **Push to remote** - Ensure work is backed up

Example handoff message:
```
## Session Summary

Completed:
- Added stock analysis endpoint
- Fixed JSON validation issue

Pending:
- Add unit tests for validators
- Update README with new endpoints

Next session should continue from: server/validators.js
```

---

## Remote Repository

```bash
# Add remote (if not using gh)
git remote add origin https://github.com/USERNAME/ai-stock-dashboard-railway.git

# Or SSH
git remote add origin git@github.com:USERNAME/ai-stock-dashboard-railway.git

# Verify
git remote -v
```
