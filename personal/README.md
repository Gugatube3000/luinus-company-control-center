# 🔒 Personal — faith · relationships · friendships · family

This area is **encrypted**. Everything private lives inside `vault.tar.enc`,
locked with a passphrase only Gustavo knows. The decrypted folder (`vault/`)
is gitignored — plaintext can never be committed, and nothing readable ever
leaves this machine.

## How it works

```
personal/
├── vault.tar.enc    ← the ONLY private thing git ever sees (AES-256 encrypted)
├── vault/           ← decrypted working copy (gitignored, exists only while unlocked)
├── unlock.sh        ← passphrase → opens vault/  (first run: creates it from templates)
├── lock.sh          ← re-encrypts vault/ → vault.tar.enc, then deletes plaintext
└── templates/       ← blank starter structure (public, contains nothing private)
```

## One-time setup (pick your passphrase)

```bash
cd personal
./unlock.sh     # no vault exists yet → builds vault/ from templates
# ...edit vault/ files, make them yours...
./lock.sh       # choose your passphrase (entered twice) → creates vault.tar.enc
git add vault.tar.enc && git commit -m "personal: initialize vault"
```

**Store the passphrase in your password manager. There is no recovery — that's
the point.**

## Daily use

```bash
cd personal && ./unlock.sh    # enter passphrase → vault/ appears
# work in vault/ (journal, prayer list, people notes)
./lock.sh                     # re-encrypt + wipe plaintext, commit vault.tar.enc
```

## What's inside (structure only — contents are yours)

- `faith.md` — walk with God: prayer list, scripture plan, church commitments
- `relationships.md` — the people closest to you, intentionally
- `family.md` — family notes, dates, ways to show up
- `friends.md` — friendships worth investing in, last-touch tracking
- `journal/` — dated entries

## Rules Claude follows here (also in root `CLAUDE.md`)

- Never unlocks the vault unless you explicitly ask in that session.
- Never copies vault content into commits, other folders, or anything public.
- Reminds you to `./lock.sh` before a session ends.
- Inside the vault, Claude's job is to help you stay faithful, present, and
  intentional with people — encouragement over optimization.
