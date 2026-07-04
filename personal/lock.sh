#!/usr/bin/env bash
# Lock the personal vault: vault/ -> vault.tar.enc, then remove plaintext.
# Plaintext is deleted ONLY after encryption verifiably succeeds.
# Passphrase: prompted twice interactively, or supplied via VAULT_PASSPHRASE env var.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d vault ]; then
  echo "Nothing to lock — vault/ doesn't exist (already locked?)."
  exit 1
fi

if [ -n "${VAULT_PASSPHRASE:-}" ]; then
  pass="$VAULT_PASSPHRASE"
else
  read -rsp "Choose/enter vault passphrase: " pass; echo
  read -rsp "Confirm passphrase: " pass2; echo
  if [ "$pass" != "$pass2" ]; then
    echo "ERROR: passphrases do not match — nothing changed." >&2
    exit 1
  fi
fi
if [ -z "$pass" ]; then
  echo "ERROR: empty passphrase not allowed — nothing changed." >&2
  exit 1
fi

tar czf - vault | VAULT_PASS="$pass" openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt \
  -pass env:VAULT_PASS -out vault.tar.enc.tmp

# verify the archive decrypts before wiping plaintext
if ! VAULT_PASS="$pass" openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -salt \
    -pass env:VAULT_PASS -in vault.tar.enc.tmp | tar tzf - >/dev/null; then
  rm -f vault.tar.enc.tmp
  echo "ERROR: verification failed — plaintext left untouched." >&2
  exit 1
fi

mv vault.tar.enc.tmp vault.tar.enc
rm -rf vault
echo "Locked → vault.tar.enc  (plaintext removed)."
echo "Commit it:  git add personal/vault.tar.enc && git commit -m 'personal: update vault'"
