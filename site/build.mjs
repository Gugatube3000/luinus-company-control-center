#!/usr/bin/env node
// Build the mobile control-center site.
//
//   node site/build.mjs <outdir>
//
// Collects the control center's markdown, encrypts it with SITE_PASSWORD
// (AES-256-GCM, key from PBKDF2-SHA256), and assembles the static site:
//
//   <outdir>/index.html …        the app shell (public, contains no data)
//   <outdir>/content.enc.json    ALL area content — ciphertext only
//   <outdir>/luinus-dashboard/   the public Luinus agents dashboard app
//
// personal/ is NEVER included — not even its ciphertext.
// If SITE_PASSWORD is unset, a placeholder payload is written so the deploy
// stays green and the site shows setup instructions instead of content.

import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const repo = join(import.meta.dirname, "..");
const out = process.argv[2];
if (!out) {
  console.error("usage: node site/build.mjs <outdir>");
  process.exit(1);
}

// ---- collect markdown -------------------------------------------------
const GROUPS = [
  { id: "now", label: "NOW", include: ["NOW.md"] },
  { id: "career", label: "Career", include: ["career"] },
  { id: "luinus", label: "Luinus", include: ["luinus"], exclude: ["luinus/dashboard"] },
  { id: "fortis", label: "Fortis Lock", include: ["fortis-lock"] },
  { id: "school", label: "Academics", include: ["academics"] },
  { id: "system", label: "System", include: ["README.md", "docs", "_templates"] },
];

function* walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const ORDER = ["README.md", "goals.md", "tasks.md"]; // dashboards first
function fileRank(relPath) {
  const base = relPath.split("/").pop();
  const i = ORDER.indexOf(base);
  return i === -1 ? ORDER.length : i;
}

function collect(group) {
  const files = [];
  for (const inc of group.include) {
    const abs = join(repo, inc);
    const paths = statSync(abs).isDirectory() ? [...walk(abs)] : [abs];
    for (const p of paths) {
      const rel = relative(repo, p);
      if (!rel.endsWith(".md")) continue;
      if (rel.startsWith("personal/")) continue; // hard exclusion, belt & suspenders
      if ((group.exclude ?? []).some((e) => rel.startsWith(e + "/"))) continue;
      const md = readFileSync(p, "utf8");
      const title = (md.match(/^#\s+(.+)$/m)?.[1] ?? rel).replace(/[#*_`]/g, "").trim();
      files.push({ path: rel, title, md });
    }
  }
  files.sort((a, b) => fileRank(a.path) - fileRank(b.path) || a.path.localeCompare(b.path));
  return files;
}

const payload = {
  generated: new Date().toISOString(),
  repo: "Gugatube3000/luinus-company-control-center",
  groups: GROUPS.map((g) => ({ id: g.id, label: g.label, files: collect(g) })),
};

// ---- encrypt -----------------------------------------------------------
const ITER = 310000;
function encrypt(json, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, ITER, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(json), "utf8"), cipher.final(), cipher.getAuthTag()]);
  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iter: ITER,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    ct: ct.toString("base64"),
  };
}

const password = process.env.SITE_PASSWORD ?? "";
const enc = password
  ? encrypt(payload, password)
  : { v: 1, placeholder: true, message: "SITE_PASSWORD secret not set" };

// ---- assemble ----------------------------------------------------------
mkdirSync(out, { recursive: true });
for (const f of ["index.html", "styles.css", "app.js", "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-512.png"]) {
  cpSync(join(repo, "site", f), join(out, f));
}
writeFileSync(join(out, "content.enc.json"), JSON.stringify(enc));
cpSync(join(repo, "luinus", "dashboard"), join(out, "luinus-dashboard"), { recursive: true });

const nFiles = payload.groups.reduce((n, g) => n + g.files.length, 0);
console.log(
  password
    ? `built ${out}: ${nFiles} files encrypted (AES-256-GCM, PBKDF2 ${ITER} iters)`
    : `built ${out}: PLACEHOLDER payload (set the SITE_PASSWORD repo secret) — no content published`,
);
