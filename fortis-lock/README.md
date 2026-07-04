# 🔩 Fortis Lock — Amazon private label → retail

Private-label lock brand. Started on Amazon; **expanding into Lowe's, launching
July 6, 2026** — the jump from marketplace to brick-and-mortar retail.

## 🚨 Right now: Lowe's launch window

Launch is **2026-07-06**. Everything else is P2 until day-1 execution is
locked. → [`lowes/launch-checklist.md`](./lowes/launch-checklist.md)

## The two channels

| Channel | State | Files |
|---------|-------|-------|
| **Amazon** | Running — private label | [`amazon/dashboard.md`](./amazon/dashboard.md) — KPIs, PPC, inventory |
| **Lowe's** | Launching 07-06 | [`lowes/launch-checklist.md`](./lowes/launch-checklist.md) · [`lowes/vendor-info.md`](./lowes/vendor-info.md) |

## Files

| File | Purpose |
|------|---------|
| [`goals.md`](./goals.md) | Revenue targets, channel strategy |
| [`tasks.md`](./tasks.md) | Execution queue |
| [`amazon/dashboard.md`](./amazon/dashboard.md) | Amazon KPI snapshot (weekly) |
| `amazon/reports/` | Weekly Business Report exports until SP-API is wired |
| [`lowes/launch-checklist.md`](./lowes/launch-checklist.md) | Day-1 launch execution |
| [`lowes/vendor-info.md`](./lowes/vendor-info.md) | Vendor #s, portal, EDI, buyer contacts |

## Data wiring

Amazon SP-API + Ads API for live metrics; LowesLink for the vendor side.
Setup steps in [`../docs/integrations.md`](../docs/integrations.md). **No API
keys in this repo — password manager only.**
