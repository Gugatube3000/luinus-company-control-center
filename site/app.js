/* Gustavo's Control Center — mobile dashboard.
   - content.enc.json is AES-256-GCM ciphertext; the password-derived key
     (PBKDF2-SHA256) decrypts it locally via WebCrypto. Nothing readable is served.
   - Task checkboxes are live: taps edit the markdown in memory and "Sync"
     commits the changed files to GitHub (fine-grained PAT, stored on-device).
   - Chat talks to the Anthropic API directly from the browser with the whole
     decrypted control center as context (API key stored on-device only). */

const $ = (id) => document.getElementById(id);
const OWNER = "Gugatube3000";
const REPO = "luinus-company-control-center";
const BRANCH = "main";
const EDIT_BASE = `https://github.com/${OWNER}/${REPO}/edit/${BRANCH}/`;
const KEYS = { pass: "cc-pass", github: "cc-gh-token", anthropic: "cc-ant-key" };

let DATA = null;          // decrypted payload {generated, groups:[{id,label,files:[{path,title,md}]}]}
let activeTab = "now";
let dirty = new Set();    // repo-relative paths with unsynced edits
let chatHistory = [];     // [{role, content}]

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

// ---------- tiny markdown renderer ----------
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

// filePath !== null makes task checkboxes interactive (data-file/data-line)
function mdToHtml(md, filePath = null) {
  const lines = md.split("\n");
  const out = [];
  let i = 0, list = null;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      closeList();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\|/.test(line) && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1] ?? "")) {
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
      out.push(`<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`);
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
      const attrs = filePath !== null
        ? ` data-file="${esc(filePath)}" data-line="${i}" role="checkbox" aria-checked="${done}" tabindex="0"`
        : "";
      out.push(`<li class="task${done ? " done" : ""}${filePath !== null ? " tappable" : ""}"${attrs}><span class="box">${done ? "✓" : ""}</span><span class="task-text">${inline(m[2])}</span></li>`);
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

// ---------- derived data (tiles + chart) ----------
function keyDates() {
  // parse the NOW.md countdown table: rows whose first cell holds an ISO date
  const now = DATA.groups.find((g) => g.id === "now")?.files[0];
  if (!now) return [];
  const out = [];
  for (const line of now.md.split("\n")) {
    const m = line.match(/^\|\s*\*{0,2}(\d{4}-\d{2}-\d{2})/);
    if (!m) continue;
    const cells = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const label = (cells[2] || "").replace(/[*_]/g, "").replace(/[\p{Emoji_Presentation}️]/gu, "").trim();
    out.push({ date: m[1], label });
  }
  return out.slice(0, 4);
}

function daysOut(iso) {
  const ms = new Date(iso + "T00:00:00") - new Date(new Date().toDateString());
  return Math.round(ms / 86400000);
}

function areaProgress() {
  return DATA.groups
    .filter((g) => !["now", "system"].includes(g.id))
    .map((g) => {
      let done = 0, total = 0;
      for (const f of g.files) {
        for (const line of f.md.split("\n")) {
          if (/^\s*[-*]\s+\[( |x|X)\]/.test(line)) {
            total++;
            if (!/\[ \]/.test(line)) done++;
          }
        }
      }
      return { id: g.id, label: g.label, done, total };
    });
}

// ---------- rendering ----------
const TAB_ICONS = { now: "🛰️", career: "💼", luinus: "🩺", fortis: "🔩", school: "🎓", system: "⚙️", chat: "💬" };

function tabs() {
  const t = DATA.groups.map((g) => ({ id: g.id, label: g.id === "now" ? "NOW" : g.label }));
  t.splice(1, 0, { id: "chat", label: "Chat" }); // chat right after NOW
  return t;
}

function renderTabs() {
  $("tabbar").innerHTML = tabs().map((g) =>
    `<button class="tab${g.id === activeTab ? " active" : ""}" data-tab="${g.id}">
       <span class="tab-icon">${TAB_ICONS[g.id] ?? "📁"}</span>
       <span class="tab-label">${g.label}</span>
     </button>`).join("");
  for (const b of document.querySelectorAll(".tab"))
    b.onclick = () => { activeTab = b.dataset.tab; renderTabs(); renderActive(); };
}

function renderActive() {
  const isChat = activeTab === "chat";
  $("chat").hidden = !isChat;
  $("content").hidden = isChat;
  if (isChat) {
    $("topbar-title").textContent = "Chat";
    return;
  }
  renderGroup();
}

function overviewHtml() {
  const tiles = keyDates().map(({ date, label }) => {
    const d = daysOut(date);
    const cls = d <= 3 ? "hot" : d <= 21 ? "warm" : "";
    return `<div class="tile ${cls}">
      <div class="tile-num">${d >= 0 ? d : "✓"}</div>
      <div class="tile-unit">${d >= 0 ? (d === 1 ? "day" : "days") : "done"}</div>
      <div class="tile-label">${esc(label)}</div>
      <div class="tile-date">${date}</div>
    </div>`;
  }).join("");

  const prog = areaProgress();
  const bars = prog.map((p) => {
    const pct = p.total ? Math.round((100 * p.done) / p.total) : 0;
    return `<div class="bar-row" title="${p.done} of ${p.total} tasks done">
      <span class="bar-name">${esc(p.label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
      <span class="bar-val">${p.done}/${p.total}</span>
    </div>`;
  }).join("");

  return `
    <section class="tiles">${tiles}</section>
    <section class="panel">
      <h3 class="panel-title">Tasks completed by area</h3>
      ${bars}
    </section>`;
}

function renderGroup() {
  const g = DATA.groups.find((x) => x.id === activeTab);
  if (!g) return;
  $("topbar-title").textContent = g.id === "now" ? "Overview" : g.label;

  const head = g.id === "now" ? overviewHtml() : "";
  const extra = g.id === "luinus"
    ? `<a class="card-link" href="luinus-dashboard/" target="_blank" rel="noopener">🖥️ Open the Luinus agents dashboard →</a>`
    : "";

  $("content").innerHTML = head + extra + g.files.map((f, idx) => `
    <details class="file"${idx === 0 ? " open" : ""}>
      <summary>
        <span class="file-title">${esc(f.title)}</span>
        <span class="file-path">${esc(f.path)}</span>
      </summary>
      <div class="md">${mdToHtml(f.md, f.path)}</div>
      <a class="edit-link" href="${EDIT_BASE}${f.path}" target="_blank" rel="noopener">✏️ Edit on GitHub</a>
    </details>`).join("");

  for (const li of $("content").querySelectorAll("li.task.tappable")) {
    li.onclick = () => toggleTask(li);
    li.onkeydown = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleTask(li); } };
  }
  window.scrollTo(0, 0);
}

// ---------- task toggling + GitHub sync ----------
function findFile(path) {
  for (const g of DATA.groups) for (const f of g.files) if (f.path === path) return f;
  return null;
}

function toggleTask(li) {
  const file = findFile(li.dataset.file);
  const n = Number(li.dataset.line);
  if (!file) return;
  const lines = file.md.split("\n");
  if (!/\[( |x|X)\]/.test(lines[n] ?? "")) return;
  const nowDone = /\[ \]/.test(lines[n]);
  lines[n] = nowDone ? lines[n].replace("[ ]", "[x]") : lines[n].replace(/\[(x|X)\]/, "[ ]");
  file.md = lines.join("\n");
  dirty.add(file.path);
  li.classList.toggle("done", nowDone);
  li.setAttribute("aria-checked", String(nowDone));
  li.querySelector(".box").textContent = nowDone ? "✓" : "";
  updateSyncButton();
}

function updateSyncButton() {
  $("sync-btn").hidden = dirty.size === 0;
  $("sync-count").textContent = dirty.size ? `(${dirty.size})` : "";
}

const utf8b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

async function syncToGitHub() {
  const token = localStorage.getItem(KEYS.github);
  if (!token) { openSettings("Add a GitHub token first to sync changes."); return; }
  const btn = $("sync-btn");
  btn.disabled = true;
  btn.textContent = "Syncing…";
  const gh = (path, opts = {}) => fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers ?? {}),
    },
  });
  try {
    for (const path of [...dirty]) {
      const file = findFile(path);
      const cur = await gh(`${path}?ref=${BRANCH}`);
      if (!cur.ok) throw new Error(`GET ${path}: ${cur.status}`);
      const { sha } = await cur.json();
      const put = await gh(path, {
        method: "PUT",
        body: JSON.stringify({
          message: `tasks: update ${path} from mobile dashboard`,
          content: utf8b64(file.md),
          sha, branch: BRANCH,
        }),
      });
      if (!put.ok) throw new Error(`PUT ${path}: ${put.status}`);
      dirty.delete(path);
    }
    btn.textContent = "✓ Synced";
    setTimeout(() => { btn.textContent = "⬆ Sync "; btn.appendChild($("sync-count")); updateSyncButton(); btn.disabled = false; }, 1500);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "⬆ Retry ";
    btn.appendChild($("sync-count"));
    alert(`Sync failed: ${err.message}\nCheck the GitHub token in Settings (needs Contents: Read & write on this repo).`);
  }
}

// ---------- chat (Anthropic API, direct from browser) ----------
function buildSystemPrompt() {
  let ctx = "";
  for (const g of DATA.groups) {
    for (const f of g.files) ctx += `\n\n===== ${f.path} =====\n${f.md}`;
  }
  if (ctx.length > 300000) ctx = ctx.slice(0, 300000);
  return `You are the operator of Gustavo Oliveira's personal control center — a mission-control assistant for his life. Today's date: ${new Date().toISOString().slice(0, 10)}.

His five areas: Career (Fisher Investments; applications ramp Aug 2026; graduates Dec 2026), Luinus (his AI medical startup), Fortis Lock (Amazon private-label business, Lowe's retail launch 2026-07-06), Academics (Economics senior at University of Tampa; Mises University Jul 19-26 2026), and Personal (private — its encrypted vault is NOT in your context; if asked, work from what he tells you in chat).

Be a sharp, warm chief-of-staff: concrete, prioritized, brief. When asked what to do, reason from the NOW board and area tasks below. Reference specific files/tasks when useful. You cannot edit files — for changes, tell him exactly what to change and in which file (he can tap checkboxes in the app or edit on GitHub).

The full current contents of the control center:${ctx}`;
}

function addBubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  $("chat-log").appendChild(div);
  $("chat-log").scrollTop = $("chat-log").scrollHeight;
  return div;
}

async function sendChat(e) {
  e.preventDefault();
  const key = localStorage.getItem(KEYS.anthropic);
  if (!key) { openSettings("Add your Anthropic API key to enable chat."); return; }
  const input = $("chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  $("chat-log").querySelector(".chat-hello")?.remove();
  addBubble("user", text);
  chatHistory.push({ role: "user", content: text });
  if (chatHistory.length > 24) chatHistory = chatHistory.slice(-24);

  const bubble = addBubble("assistant", "…");
  $("chat-send").disabled = true;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: [{ type: "text", text: buildSystemPrompt(), cache_control: { type: "ephemeral" } }],
        messages: chatHistory,
        stream: true,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${resp.status}`);
    }
    bubble.textContent = "";
    let acc = "";
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n");
      buf = parts.pop();
      for (const line of parts) {
        if (!line.startsWith("data: ")) continue;
        let ev;
        try { ev = JSON.parse(line.slice(6)); } catch { continue; }
        if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
          acc += ev.delta.text;
          bubble.textContent = acc;
          $("chat-log").scrollTop = $("chat-log").scrollHeight;
        }
      }
    }
    if (!acc) acc = "(no reply — the request may have been declined)";
    bubble.textContent = acc;
    chatHistory.push({ role: "assistant", content: acc });
  } catch (err) {
    bubble.textContent = `⚠️ ${err.message}`;
    bubble.classList.add("error");
    chatHistory.pop(); // keep history consistent on failure
  } finally {
    $("chat-send").disabled = false;
  }
}

// ---------- settings ----------
function openSettings(note) {
  $("set-anthropic").value = localStorage.getItem(KEYS.anthropic) ?? "";
  $("set-github").value = localStorage.getItem(KEYS.github) ?? "";
  $("settings").hidden = false;
  if (note) {
    const h = $("settings").querySelector("h2");
    h.textContent = "Settings";
    const p = document.createElement("p");
    p.className = "field-hint note";
    p.textContent = note;
    $("settings").querySelector(".sheet .note")?.remove();
    h.after(p);
  }
}

function saveSettings() {
  const a = $("set-anthropic").value.trim();
  const g = $("set-github").value.trim();
  a ? localStorage.setItem(KEYS.anthropic, a) : localStorage.removeItem(KEYS.anthropic);
  g ? localStorage.setItem(KEYS.github, g) : localStorage.removeItem(KEYS.github);
  $("settings").hidden = true;
}

function lock() {
  localStorage.removeItem(KEYS.pass);
  location.reload();
}

// ---------- boot ----------
function show(id) {
  for (const s of ["gate", "setup", "app"]) $(s).hidden = s !== id;
}

function boot(data) {
  DATA = data;
  $("topbar-meta").textContent = "updated " + new Date(data.generated).toISOString().slice(0, 10);
  show("app");
  renderTabs();
  renderActive();
}

async function main() {
  const enc = await (await fetch("content.enc.json", { cache: "no-store" })).json();
  if (enc.placeholder) { show("setup"); return; }

  const saved = localStorage.getItem(KEYS.pass);
  if (saved) {
    try { boot(await decrypt(enc, saved)); return; }
    catch { localStorage.removeItem(KEYS.pass); }
  }

  show("gate");
  $("gate-form").onsubmit = async (e) => {
    e.preventDefault();
    const pass = $("gate-pass").value;
    $("gate-btn").disabled = true;
    $("gate-btn").textContent = "Unlocking…";
    try {
      const data = await decrypt(enc, pass);
      if ($("gate-remember").checked) localStorage.setItem(KEYS.pass, pass);
      boot(data);
    } catch {
      $("gate-err").hidden = false;
      $("gate-btn").disabled = false;
      $("gate-btn").textContent = "Unlock";
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  $("settings-btn").onclick = () => openSettings();
  $("set-save").onclick = saveSettings;
  $("set-close").onclick = () => { $("settings").hidden = true; };
  $("settings").onclick = (e) => { if (e.target === $("settings")) $("settings").hidden = true; };
  $("lock-btn").onclick = lock;
  $("sync-btn").onclick = syncToGitHub;
  $("chat-form").onsubmit = sendChat;
  $("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("chat-form").requestSubmit(); }
  });
  main().catch((err) => {
    document.body.innerHTML = `<div class="gate"><div class="gate-card"><h1>Load error</h1><p class="gate-sub">${esc(String(err))}</p></div></div>`;
  });
});
