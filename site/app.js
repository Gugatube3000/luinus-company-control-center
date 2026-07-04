/* Gustavo's Control Center — mobile shell.
   Fetches content.enc.json (AES-256-GCM ciphertext), derives the key from the
   password with PBKDF2-SHA256 in the browser, and renders the markdown.
   No plaintext ever leaves the device; "remember" stores the password locally
   on YOUR device only. */

const $ = (id) => document.getElementById(id);
const REMEMBER_KEY = "cc-pass";
const EDIT_BASE = "https://github.com/Gugatube3000/luinus-company-control-center/edit/main/";

let DATA = null;
let activeTab = "now";

// ---------- crypto ----------
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function decrypt(enc, password) {
  const baseKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: b64(enc.salt), iterations: enc.iter },
    baseKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(enc.iv) }, key, b64(enc.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

// ---------- tiny markdown renderer (covers what the repo uses) ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    let href = u;
    if (!/^[a-z]+:/i.test(u)) href = EDIT_BASE + u.replace(/^\.\.?\//g, "").replace(/\/$/, "/README.md");
    return `<a href="${href}" target="_blank" rel="noopener">${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  return s;
}

function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0, list = null; // list: "ul" | "ol"
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) { // code fence
      closeList();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\|/.test(line) && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1] ?? "")) { // table
      closeList();
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push('<div class="table-wrap"><table><thead><tr>' +
        head.map((h) => `<th>${h}</th>`).join("") + "</tr></thead><tbody>" +
        body.map((r) => "<tr>" + r.map((c) => `<td>${c}</td>`).join("") + "</tr>").join("") +
        "</tbody></table></div>");
      continue;
    }

    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      closeList();
      out.push(`<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`); // h1 -> h2 etc (page has its own h1)
    } else if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      closeList();
      out.push("<hr>");
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      closeList();
      const buf = [m[1]];
      while (i + 1 < lines.length && /^>/.test(lines[i + 1])) buf.push(lines[++i].replace(/^>\s?/, ""));
      out.push(`<blockquote>${buf.map(inline).join("<br>")}</blockquote>`);
    } else if ((m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/))) {
      if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
      const done = m[1] !== " ";
      out.push(`<li class="task${done ? " done" : ""}"><span class="box">${done ? "✓" : ""}</span>${inline(m[2])}</li>`);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
    i++;
  }
  closeList();
  return out.join("\n");
}

// ---------- rendering ----------
const TAB_ICONS = { now: "🛰️", career: "💼", luinus: "🩺", fortis: "🔩", school: "🎓", system: "⚙️" };

function renderTabs() {
  $("tabbar").innerHTML = DATA.groups.map((g) =>
    `<button class="tab${g.id === activeTab ? " active" : ""}" data-tab="${g.id}">
       <span class="tab-icon">${TAB_ICONS[g.id] ?? "📁"}</span>
       <span class="tab-label">${g.label}</span>
     </button>`).join("");
  for (const b of document.querySelectorAll(".tab"))
    b.onclick = () => { activeTab = b.dataset.tab; renderTabs(); renderGroup(); };
}

function renderGroup() {
  const g = DATA.groups.find((x) => x.id === activeTab);
  $("topbar-title").textContent = g.label;
  const extra = g.id === "luinus"
    ? `<a class="card-link" href="luinus-dashboard/" target="_blank" rel="noopener">🖥️ Open the Luinus agents dashboard →</a>`
    : "";
  $("content").innerHTML = extra + g.files.map((f, idx) => `
    <details class="file"${idx === 0 ? " open" : ""}>
      <summary>
        <span class="file-title">${esc(f.title)}</span>
        <span class="file-path">${esc(f.path)}</span>
      </summary>
      <div class="md">${mdToHtml(f.md)}</div>
      <a class="edit-link" href="${EDIT_BASE}${f.path}" target="_blank" rel="noopener">✏️ Edit on GitHub</a>
    </details>`).join("");
  $("content").scrollTop = 0;
  window.scrollTo(0, 0);
}

function show(id) {
  for (const s of ["gate", "setup", "app"]) $(s).hidden = s !== id;
}

function boot(data) {
  DATA = data;
  const d = new Date(data.generated);
  $("topbar-meta").textContent = "updated " + d.toISOString().slice(0, 10);
  show("app");
  renderTabs();
  renderGroup();
}

// ---------- gate ----------
async function main() {
  const enc = await (await fetch("content.enc.json", { cache: "no-store" })).json();
  if (enc.placeholder) { show("setup"); return; }

  const saved = localStorage.getItem(REMEMBER_KEY);
  if (saved) {
    try { boot(await decrypt(enc, saved)); return; }
    catch { localStorage.removeItem(REMEMBER_KEY); }
  }

  show("gate");
  $("gate-form").onsubmit = async (e) => {
    e.preventDefault();
    const pass = $("gate-pass").value;
    $("gate-btn").disabled = true;
    $("gate-btn").textContent = "Unlocking…";
    try {
      const data = await decrypt(enc, pass);
      if ($("gate-remember").checked) localStorage.setItem(REMEMBER_KEY, pass);
      boot(data);
    } catch {
      $("gate-err").hidden = false;
      $("gate-btn").disabled = false;
      $("gate-btn").textContent = "Unlock";
    }
  };

  $("lock-btn").onclick = lock;
}

function lock() {
  localStorage.removeItem(REMEMBER_KEY);
  location.reload();
}
document.addEventListener("DOMContentLoaded", () => {
  $("lock-btn").onclick = lock;
  main().catch((err) => {
    document.body.innerHTML = `<div class="gate"><div class="gate-card"><h1>Load error</h1><p class="gate-sub">${esc(String(err))}</p></div></div>`;
  });
});
