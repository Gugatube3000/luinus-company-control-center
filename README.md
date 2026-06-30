# Luinus Company Control Center

A standalone, premium **mission-control dashboard** for running a company of AI
agents. Not a chatbot, not a generic admin panel — an operating system that lets
a founder understand the company in under 15 seconds and act immediately.

> Built to answer five questions at a glance: **What are the agents doing right
> now? What's blocked? What needs a human decision? What changed today? What
> should happen next?**

## Run it

Open `index.html` in any browser, or serve the folder with a static server:

```bash
python3 -m http.server 8080   # then visit http://localhost:8080
```

No build step, no dependencies. State persists to `localStorage`.

## The seven views

| View | What it's for |
|------|---------------|
| **Mission Control** | Company health tiles, the single highest-leverage next move, the CEO inbox, the risk radar, lane pulse, and the activity stream. |
| **Kanban Board** | Every goal the agents are working, 24/7. Drag cards across **Backlog → In Progress → Blocked → Review/QA → Shipped**. |
| **Agents** | The roster. Each card is actionable (Poke · Work · Pause · Escalate · Finish). Click to open the full drill-down. |
| **Execution Queue** | Prioritized work with P0/P1/P2, sort-by-priority, status filters, and Done/Defer/Rerun actions. |
| **Founder Decisions** | The CEO inbox — only the calls that need a human. Resolve · Approve · Reject · Send back · Keep open. |
| **Alerts & Blockers** | Blocked lanes, unverified claims, provenance gaps, stale agents. Derived live from state, so it's always honest. |
| **Agent Souls** | Each agent's operating contract — directive, principles, tools, decision rights, and voice. |

## Key interactions

- **24/7 Autopilot** — toggle in the sidebar. Agents advance the company loop on
  their own (progress ticks, tasks flow across the Kanban, activity streams in).
- **Drill-down drawer** — click any agent or task for runs, inputs/outputs,
  errors, dependencies, related work, timeline, and next steps.
- **Resolving a blocker decision** (e.g. pilot pricing) automatically unblocks
  the waiting agent and moves its task forward — the dashboard is wired, not mocked.
- **Refresh cycle** / **Advance company cycle** push the simulation forward.
- **Export snapshot** downloads a JSON of the full company state (and copies it
  to the clipboard) — an audit log you can hand off.

## Agent souls

The `souls/` directory holds a `soul.md` for each of the eight agents — the
durable identity, judgment, and **tool discipline** an agent carries into every
run. See [`souls/README.md`](./souls/README.md) for the shared charter.

| Agent | Codename | Lane |
|-------|----------|------|
| COO / Orchestrator | Atlas | Orchestration |
| Sales | Closer | Revenue |
| Marketing | Signal | Revenue |
| Product | Forge | Product |
| Ops / Compliance | Anchor | Operations |
| QA / Review | Sentinel | Quality |
| Research | Scout | Research |
| Customer Success | Harbor | Customer |

The in-app **Agent Souls** view renders a structured summary of each; the `.md`
files are the source of truth an agent runtime would actually load.

## Files

```
index.html   — shell: sidebar nav, seven views, drill-down drawer
styles.css   — dark, dense, mission-control design system
data.js      — seed state (agents, tasks, decisions, alerts, activity)
souls.js     — structured soul data for the in-app Souls view
app.js       — state, routing, rendering, Kanban DnD, autopilot, actions
souls/*.md   — canonical agent souls (the real deliverable)
```

## Wiring to real data later

Everything renders from the `SEED` object in `data.js`. Swap that for real agent
telemetry (same shape) and the UI works unchanged. Tasks are the single source of
truth and power both the Execution Queue and the Kanban board.
