# 🩺 Luinus — AI medical startup

The company HQ inside the control center. Deep notes live in the **Obsidian
vault** (source of truth for research/strategy) — this folder is the execution
layer: goals, tasks, and the deployed agents dashboard.

> **Wire the vault:** Obsidian has no hosted connector — the best move is
> git-syncing the vault so Claude can read it in any session.
> Options ranked in [`../docs/integrations.md`](../docs/integrations.md).

## Files

| Path | Purpose |
|------|---------|
| [`dashboard/`](./dashboard/) | The mission-control web app for Luinus's AI agents — **this is what GitHub Pages deploys** (and the only public part of this repo) |
| [`goals.md`](./goals.md) | Company milestones |
| [`tasks.md`](./tasks.md) | Current execution queue |
| `notes/` | Stopgap for vault exports until Obsidian is wired |

## Current state

- Agents dashboard built & deployed (Kanban, execution queue, founder
  decisions, agent souls). See [`dashboard/README.md`](./dashboard/README.md).
- Next frontier: swap the dashboard's simulated `SEED` data for real agent
  telemetry, and connect the Obsidian vault so strategy and execution live in
  one system.
