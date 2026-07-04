# Gustavo's Control Center

One repo that runs my whole life. Five areas, one dashboard, operated by me +
Claude. Plain markdown so I own everything forever — it opens in Obsidian, in
GitHub, in any editor, and any AI agent can operate it.

> **Start here every day → [`NOW.md`](./NOW.md)** — the single page that answers
> "what matters today, what's coming, what's blocked."

## The five areas

| Area | What it runs | Key date |
|------|--------------|----------|
| [`career/`](./career/) | Fisher Investments job + full-time search | Applications ramp **Aug 2026**, graduate **Dec 2026** |
| [`luinus/`](./luinus/) | AI medical startup (agents dashboard lives here) | — |
| [`fortis-lock/`](./fortis-lock/) | Amazon private label + Lowe's expansion | **Lowe's launch July 6, 2026** |
| [`academics/`](./academics/) | Senior year, Economics @ University of Tampa | **Mises University July 19–26, 2026** |
| [`personal/`](./personal/) 🔒 | Faith, relationships, friendships, family | Encrypted — passphrase required |

## How it works

- **`NOW.md`** is the cockpit — top priorities across all areas, upcoming dates,
  and what's blocked. Reviewed/updated in every session.
- **Each area folder** has a `README.md` (the area dashboard), `goals.md`, and
  `tasks.md`, plus area-specific files. Same shape everywhere, so nothing gets lost.
- **`personal/`** is different: its contents live in an encrypted vault
  (`personal/vault.tar.enc`). Nothing readable is ever committed — you need the
  passphrase to unlock it. See [`personal/README.md`](./personal/README.md).
- **`CLAUDE.md`** is the operating manual Claude loads in every session — the
  rules, the cadence, and the privacy boundaries.
- **`docs/integrations.md`** is the wiring guide — every MCP connector and API
  to plug in (Gmail, Google Calendar, Notion, Obsidian, Amazon SP-API, Canvas…)
  and exactly how to connect each one.
- **`_templates/`** holds the weekly-review and daily-note templates.

## 📱 The phone app (GitHub Pages)

`site/` is a password-protected mobile web app of this whole control center.
The deploy publishes **encrypted content only** (AES-256-GCM, password =
the `SITE_PASSWORD` repo secret); it decrypts in your browser after you enter
the password. `personal/` is never included, even encrypted.

One-time setup: repo **Settings → Secrets and variables → Actions → New
repository secret** → name `SITE_PASSWORD`, value = the password you want to
type on your phone. Then visit the Pages URL, unlock, and "Add to Home Screen".

The Luinus agents dashboard ([`luinus/dashboard/`](./luinus/dashboard/)) is
served publicly at `/luinus-dashboard/` on the same site.

## Design principles

1. **One page to rule them** — if `NOW.md` doesn't drive an action, fix `NOW.md`.
2. **Plain text, owned forever** — markdown in git; no platform lock-in.
3. **Same shape per area** — README (dashboard) / goals / tasks, everywhere.
4. **Private means encrypted** — not "hidden", not "obscure". Encrypted.
5. **Review cadence beats fancy tooling** — weekly review Sundays, daily glance
   at `NOW.md`.
