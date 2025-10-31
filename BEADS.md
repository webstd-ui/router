# Beads Quickstart

Get up and running with Beads in 2 minutes.

## Your First Issues

```bash
# Create a few issues
./bd create "Set up database" -p 1 -t task
./bd create "Create API" -p 2 -t feature
./bd create "Add authentication" -p 2 -t feature

# List them
./bd list
```

## Add Dependencies

```bash
# API depends on database
./bd dep add bd-2 bd-1

# Auth depends on API
./bd dep add bd-3 bd-2

# View the tree
./bd dep tree bd-3
```

Output:

```
🌲 Dependency tree for bd-3:

→ bd-3: Add authentication [P2] (open)
  → bd-2: Create API [P2] (open)
    → bd-1: Set up database [P1] (open)
```

## Find Ready Work

```bash
./bd ready
```

Output:

```
📋 Ready work (1 issues with no blockers):

1. [P1] bd-1: Set up database
```

Only bd-1 is ready because bd-2 and bd-3 are blocked!

## Work the Queue

```bash
# Start working on bd-1
./bd update bd-1 --status in_progress

# Complete it
./bd close bd-1 --reason "Database setup complete"

# Check ready work again
./bd ready
```

Now bd-2 is ready! 🎉

## Track Progress

```bash
# See blocked issues
./bd blocked

# View statistics
./bd stats
```

## Database Location

By default: `~/.beads/default.db`

You can use project-specific databases:

```bash
./bd --db ./my-project.db create "Task"
```

## Migrating Databases

After upgrading bd, use `bd migrate` to check for and migrate old database files:

```bash
# Check for migration opportunities
./bd migrate --dry-run

# Migrate old databases to beads.db
./bd migrate

# Migrate and clean up old files
./bd migrate --cleanup --yes
```

## Next Steps

-   Add labels: `./bd create "Task" -l "backend,urgent"`
-   Filter ready work: `./bd ready --priority 1`
-   Search issues: `./bd list --status open`
-   Detect cycles: `./bd dep cycles`
