#!/usr/bin/env bash
# Unlock the personal vault: vault.tar.enc -> vault/
# First run (no vault.tar.enc yet): builds vault/ from templates/.
# Passphrase: prompted interactively, or supplied via VAULT_PASSPHRASE env var.
set -euo pipefail
cd "$(dirname "$0")"

if [ -d vault ]; then
  echo "vault/ already exists — it's unlocked. (Run ./lock.sh when done.)"
  exit 0
fi

if [ ! -f vault.tar.enc ]; then
  echo "No vault.tar.enc found — first-time setup."
  mkdir -p vault/journal
  cp templates/*.md vault/ 2>/dev/null || true
  echo "Created vault/ from templates. Edit it, then run ./lock.sh to choose"
  echo "your passphrase and create the encrypted vault."
  exit 0
fi

if [ -n "${VAULT_PASSPHRASE:-}" ]; then
  pass="$VAULT_PASSPHRASE"
else
  read -rsp "Vault passphrase: " pass; echo
fi

VAULT_PASS="$pass" openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -salt \
  -pass env:VAULT_PASS -in vault.tar.enc | tar xzf -
echo "Unlocked → personal/vault/  (run ./lock.sh when finished)"
