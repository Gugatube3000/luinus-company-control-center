# Integrations — wiring the control center to everything

The goal: every area pulls live data instead of me copy-pasting. Two kinds of
wiring — **claude.ai connectors** (one-click OAuth, work in web/mobile/desktop
sessions) and **APIs/local MCP servers** (for data that has no hosted connector).

## ✅ Already connected

| Tool | Used for |
|------|----------|
| **GitHub MCP** | This repo — issues, PRs, deploys of the Luinus dashboard |

## 1-click claude.ai connectors (connect these first)

Connect at **claude.ai → Settings → Connectors**, then enable them per-chat.

| Connector | Area(s) | Why |
|-----------|---------|-----|
| **Gmail** | Career, Fortis Lock | Recruiter threads, Amazon/Lowe's vendor emails, application follow-ups |
| **Google Calendar** | All | Deadlines, classes, Mises University travel, launch dates → auto-sync with `NOW.md` |
| **Notion** | Luinus, Career | If any planning lives in Notion, Claude can read/write it directly |
| **Stripe** | Luinus | Revenue/customers once Luinus starts billing |
| **Canva** | Fortis Lock, Luinus | Listing images, decks, marketing assets |

## Obsidian (Luinus vault) — 3 options, best first

Obsidian has no hosted claude.ai connector (it's a local app), so pick one:

1. **Git-sync the vault (recommended, zero moving parts).** Install the
   community plugin **obsidian-git** in the vault, push it to a private GitHub
   repo, then in any Claude session say _"add repo <owner>/<vault-repo>"_ —
   Claude can read the whole Luinus vault instantly. Works from web + mobile.
2. **Local MCP server (for Claude Desktop / Claude Code on your machine).**
   Install the **Local REST API** community plugin in Obsidian, then add the
   `mcp-obsidian` MCP server to Claude Desktop config. Claude gets live
   read/write to notes while Obsidian runs.
3. **Manual export.** Drop relevant notes into `luinus/notes/` as markdown.
   Fine as a stopgap; gets stale.

## Fortis Lock — Amazon + Lowe's

| Integration | How |
|-------------|-----|
| **Amazon SP-API** | Register as a developer in Seller Central → Apps & Services → Develop Apps. Gives orders, inventory, finances, ads programmatically. Store keys OUTSIDE this repo (password manager). Until then: weekly Business Reports CSV export into `fortis-lock/amazon/reports/`. |
| **Amazon Ads API** | Same developer console; pulls PPC performance. |
| **Lowe's (LowesLink / Vendor Gateway)** | Vendor portal for POs, item setup, compliance docs. EDI usually goes through a provider (SPS Commerce is the common one). Track credentials/contacts in `fortis-lock/lowes/vendor-info.md`. |
| **Keepa / Helium 10 / Jungle Scout** | All have APIs on paid plans for rank + competitor tracking. Optional. |

## Academics — University of Tampa

| Integration | How |
|-------------|-----|
| **Canvas LMS API** | UT runs Canvas. Account → Settings → **+ New Access Token**. With the token, Claude can pull assignments, due dates, grades. Keep the token in a password manager, never in this repo. |
| **Google Calendar** | Sync class schedule + assignment due dates (covered above). |

## Career

| Integration | How |
|-------------|-----|
| **LinkedIn** | No usable public API — track applications manually in `career/applications/tracker.md` (Claude keeps it updated from what you paste/forward). |
| **Gmail connector** | Recruiter + application email triage (covered above). |
| **Simplify / job boards** | Use their exports; paste into the tracker. |

## Personal 🔒

Deliberately **no external integrations**. That folder stays local, encrypted,
and between you and God. Calendar events for personal commitments can live in
Google Calendar under a separate calendar if wanted.

## Security rules

- **No secrets in this repo. Ever.** API keys, tokens, passphrases → password
  manager (1Password/Bitwarden). This repo may become public tooling one day.
- The GitHub Pages deploy publishes ONLY `luinus/dashboard/` — never widen it.
- `personal/` plaintext is gitignored; only the encrypted `vault.tar.enc` is
  ever committed.
