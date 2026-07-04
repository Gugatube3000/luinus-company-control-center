/* Luinus Company Control Center — application logic
 * Vanilla JS SPA. No build step. State persists to localStorage and can be
 * swapped for real agent telemetry later (see data.js for the shape).
 */

'use strict';

const STORAGE_KEY = 'luinus-control-center:v2';
const STAGES = [
  { id: 'backlog', label: 'Backlog', hint: 'Queued' },
  { id: 'in_progress', label: 'In Progress', hint: 'Working 24/7' },
  { id: 'blocked', label: 'Blocked', hint: 'Needs unblock' },
  { id: 'review', label: 'Review / QA', hint: 'Gatekeeping' },
  { id: 'shipped', label: 'Shipped', hint: 'Done' },
];
const VIEWS = {
  mission: { title: 'Mission Control', sub: 'What the company is doing right now — and what needs your call.' },
  kanban: { title: 'Kanban Board', sub: 'Every goal the agents are working, 24/7. Drag a card to move it.' },
  agents: { title: 'Agents', sub: 'The roster. Each card is actionable — open one for the full picture.' },
  queue: { title: 'Execution Queue', sub: 'Prioritized work. Sort, filter, and drive items to done.' },
  decisions: { title: 'Founder Decisions', sub: 'The CEO inbox. Only the calls that genuinely need you.' },
  alerts: { title: 'Alerts & Blockers', sub: 'What is stuck, stale, or risky. Hard to miss, never noisy.' },
  souls: { title: 'Agent Souls', sub: 'The operating contract each agent carries into every run.' },
};

let state = loadState();
let currentView = 'mission';
let queueFilter = 'all';
let autopilotTimer = null;
let clockTimer = null;

const $ = (id) => document.getElementById(id);
const dom = {
  views: {
    mission: $('view-mission'), kanban: $('view-kanban'), agents: $('view-agents'),
    queue: $('view-queue'), decisions: $('view-decisions'), alerts: $('view-alerts'), souls: $('view-souls'),
  },
  viewTitle: $('viewTitle'), viewSubtitle: $('viewSubtitle'),
  nav: $('nav'), navDecisions: $('navDecisions'), navAlerts: $('navAlerts'),
  autopilotToggle: $('autopilotToggle'), autopilotSub: $('autopilotSub'),
  cadencePill: $('cadencePill'), clockPill: $('clockPill'),
  sidebarStatus: $('sidebarStatus'),
  refreshBtn: $('refreshBtn'), exportBtn: $('exportBtn'),
  drawer: $('drawer'), drawerInner: $('drawerInner'), drawerBackdrop: $('drawerBackdrop'),
  toast: $('toast'),
};

init();

function init() {
  bindGlobalActions();
  setView(location.hash.replace('#', '') || 'mission');
  startClock();
  if (state.meta.autopilot) startAutopilot(true);
  syncAutopilotUI();
}

/* ------------------------------------------------------------------ state */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return structuredClone(window.LUINUS_SEED);
}
function save() {
  state.meta.lastRefresh = new Date().toISOString();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
}
function rerender() { renderCurrentView(); renderChrome(); }
function commit() { save(); rerender(); }

function resetState() {
  state = structuredClone(window.LUINUS_SEED);
  state.meta.startedAt = new Date().toISOString();
  commit();
  toast('State reset to seed.');
}

/* --------------------------------------------------------------- routing */
function setView(name) {
  if (!VIEWS[name]) name = 'mission';
  currentView = name;
  location.hash = name;
  Object.entries(dom.views).forEach(([k, elv]) => elv.classList.toggle('active', k === name));
  dom.nav.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  dom.viewTitle.textContent = VIEWS[name].title;
  dom.viewSubtitle.textContent = VIEWS[name].sub;
  renderCurrentView();
  renderChrome();
  dom.views[name].parentElement.scrollTop = 0;
}

function renderCurrentView() {
  ({
    mission: renderMission, kanban: renderKanban, agents: renderAgents,
    queue: renderQueue, decisions: renderDecisions, alerts: renderAlerts, souls: renderSouls,
  })[currentView]();
}

/* --------------------------------------------------------------- metrics */
function metrics() {
  const a = state.agents, t = state.tasks;
  const shipped = t.filter((x) => x.stage === 'shipped').length;
  const open = t.filter((x) => x.stage !== 'shipped').length;
  const critical = t.filter((x) => x.priority === 'P0' && x.stage !== 'shipped').length;
  const blockedTasks = t.filter((x) => x.stage === 'blocked').length;
  const timeSaved = (shipped * 3.5 + a.reduce((s, x) => s + x.progress, 0) / 100 * 1.6).toFixed(1);
  return {
    active: a.filter((x) => x.status === 'live').length,
    blocked: a.filter((x) => x.status === 'blocked').length,
    idle: a.filter((x) => x.status === 'idle').length,
    waiting: a.filter((x) => x.status === 'waiting').length,
    total: a.length,
    openDecisions: state.decisions.filter((d) => d.status === 'open').length,
    openTasks: open, critical, shipped, blockedTasks,
    risks: state.alerts.filter((x) => x.severity === 'critical').length,
    timeSaved,
  };
}

function recommendation() {
  const m = metrics();
  const pricing = state.decisions.find((d) => d.id === 'd1' && d.status === 'open');
  if (m.risks > 0) {
    const al = state.alerts.find((x) => x.severity === 'critical');
    return { label: 'Highest-leverage move', text: al.title, detail: al.detail, go: () => setView('alerts') };
  }
  if (pricing) return { label: 'Unblock revenue', text: 'Resolve pilot pricing', detail: 'Sales is blocked until this is your call. Decide it and the Otero follow-up moves.', go: () => setView('decisions') };
  if (m.blocked > 0) return { label: 'Clear a blocker', text: `${m.blocked} agent(s) blocked`, detail: 'A blocked lane is the first priority every cycle.', go: () => setView('agents') };
  if (m.openDecisions > 0) return { label: 'Make the call', text: `${m.openDecisions} decision(s) waiting`, detail: 'Resolve these so the lanes can keep moving.', go: () => setView('decisions') };
  return { label: 'Momentum', text: 'Company is flowing', detail: 'No blockers and no open decisions. Push the next P0 to shipped.', go: () => setView('kanban') };
}

/* --------------------------------------------------------------- chrome */
function renderChrome() {
  const m = metrics();
  dom.navDecisions.textContent = m.openDecisions || '';
  dom.navDecisions.style.display = m.openDecisions ? '' : 'none';
  dom.navAlerts.textContent = m.risks || '';
  dom.navAlerts.style.display = m.risks ? '' : 'none';
  dom.cadencePill.textContent = `Loop · ${state.meta.cadence}`;
  dom.sidebarStatus.textContent = state.meta.autopilot ? 'Autopilot running' : 'Company live · seeded state';
}

/* ===================================================================== */
/*  VIEW: MISSION CONTROL                                                  */
/* ===================================================================== */
function renderMission() {
  const m = metrics();
  const rec = recommendation();
  const tiles = [
    tile('Agents live', `${m.active}/${m.total}`, 'tone-good', `${m.idle} idle · ${m.waiting} waiting`),
    tile('Blocked lanes', String(m.blocked), m.blocked ? 'tone-bad' : 'tone-good', 'Need founder or COO'),
    tile('Open decisions', String(m.openDecisions), m.openDecisions ? 'tone-warn' : 'tone-good', 'Your call'),
    tile('Critical tasks', String(m.critical), m.critical ? 'tone-bad' : 'tone-good', 'P0 in flight'),
    tile('Shipped', String(m.shipped), 'tone-info', 'Throughput'),
    tile('Time saved', `${m.timeSaved}h`, 'tone-info', 'Est. this run'),
  ].join('');

  dom.views.mission.innerHTML = `
    <div class="metrics-row">${tiles}</div>

    <button class="recommend" data-act="rec-go">
      <div class="recommend-left">
        <span class="recommend-eyebrow">${rec.label}</span>
        <strong>${esc(rec.text)}</strong>
        <span class="recommend-detail">${esc(rec.detail)}</span>
      </div>
      <span class="recommend-cta">Take me there →</span>
    </button>

    <div class="mission-grid">
      <section class="panel">
        <div class="panel-head">
          <div><span class="eyebrow">CEO inbox</span><h3>What still needs your call</h3></div>
          <button class="link" data-act="goto" data-view="decisions">View all</button>
        </div>
        <div class="stack">${decisionsHTML(state.decisions.filter((d) => d.status === 'open').slice(0, 3), true)}</div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div><span class="eyebrow">Risk radar</span><h3>Alerts & blockers</h3></div>
          <button class="link" data-act="goto" data-view="alerts">View all</button>
        </div>
        <div class="stack">${alertsHTML(state.alerts.slice(0, 4))}</div>
      </section>

      <section class="panel pulse-panel">
        <div class="panel-head"><div><span class="eyebrow">Company pulse</span><h3>Lane status</h3></div></div>
        <div class="pulse">${pulseHTML()}</div>
      </section>

      <section class="panel activity-panel">
        <div class="panel-head">
          <div><span class="eyebrow">Audit trail</span><h3>Activity stream</h3></div>
          <span class="subtle">${state.activity.length} recent</span>
        </div>
        <div class="activity">${activityHTML(state.activity.slice(0, 8))}</div>
      </section>
    </div>`;
}

function pulseHTML() {
  return state.agents.map((ag) => `
    <button class="pulse-chip ${ag.status}" data-act="open-agent" data-id="${ag.id}" title="${esc(ag.mission)}">
      <span class="avatar">${initials(ag.codename)}</span>
      <span class="pulse-meta">
        <span class="pulse-name">${esc(ag.codename)}</span>
        <span class="pulse-status">${statusLabel(ag.status)}</span>
      </span>
      <span class="dot ${ag.status}"></span>
    </button>`).join('');
}

/* ===================================================================== */
/*  VIEW: KANBAN                                                           */
/* ===================================================================== */
function renderKanban() {
  const cols = STAGES.map((s) => {
    const items = state.tasks.filter((t) => t.stage === s.id);
    return `
      <div class="kcol" data-stage="${s.id}">
        <div class="kcol-head">
          <div class="kcol-title"><span class="kcol-dot st-${s.id}"></span>${s.label}</div>
          <span class="kcol-count">${items.length}</span>
        </div>
        <div class="kcol-hint">${s.hint}</div>
        <div class="kcol-body" data-stage="${s.id}">
          ${items.map(kanbanCard).join('') || `<div class="kcol-empty">Nothing here</div>`}
        </div>
      </div>`;
  }).join('');

  dom.views.kanban.innerHTML = `
    <div class="kanban-bar">
      <span class="subtle">Drag cards across stages, or use a card's menu. Agents keep these moving on Autopilot.</span>
      <button class="btn btn-ghost btn-small" data-act="advance">⏩ Advance company cycle</button>
    </div>
    <div class="kanban">${cols}</div>`;

  wireKanbanDnD();
}

function kanbanCard(t) {
  const ag = agentById(t.owner);
  const overdue = t.stage !== 'shipped' && t.dueIn <= 1;
  return `
    <article class="kcard ${t.stage === 'shipped' ? 'is-done' : ''}" draggable="true" data-task-id="${t.id}" data-act="open-task" data-id="${t.id}">
      <div class="kcard-top">
        <span class="ptag p${t.priority[1]}">${t.priority}</span>
        ${overdue ? `<span class="due-flag">${t.dueIn <= 0 ? 'due' : 'due soon'}</span>` : `<span class="due-soft">${t.dueIn}d</span>`}
      </div>
      <div class="kcard-title">${esc(t.title)}</div>
      <div class="kcard-detail">${esc(t.detail)}</div>
      ${t.deps && t.deps.length ? `<div class="kcard-dep">⛓ ${esc(t.deps.join(', '))}</div>` : ''}
      <div class="kcard-foot">
        <span class="owner"><span class="avatar xs">${ag ? initials(ag.codename) : '?'}</span>${ag ? esc(ag.codename) : t.owner}</span>
        <span class="lane-chip">${esc(t.lane)}</span>
      </div>
    </article>`;
}

function wireKanbanDnD() {
  let dragId = null;
  dom.views.kanban.querySelectorAll('.kcard').forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      dragId = card.dataset.taskId;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
    });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); dragId = null; });
  });
  dom.views.kanban.querySelectorAll('.kcol-body').forEach((body) => {
    body.addEventListener('dragover', (e) => { e.preventDefault(); body.classList.add('drop-hot'); });
    body.addEventListener('dragleave', () => body.classList.remove('drop-hot'));
    body.addEventListener('drop', (e) => {
      e.preventDefault();
      body.classList.remove('drop-hot');
      const id = dragId || e.dataTransfer.getData('text/plain');
      moveTaskStage(id, body.dataset.stage);
    });
  });
}

function moveTaskStage(id, stage) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t || t.stage === stage) return;
  const from = t.stage;
  t.stage = stage;
  if (stage === 'shipped') { t.priority = t.priority; }
  pushActivity(systemActor(), `Task moved ${stageLabel(from)} → ${stageLabel(stage)}: ${t.title}.`, t.lane.toLowerCase());
  reconcileAlerts();
  commit();
  toast(`“${t.title}” → ${stageLabel(stage)}`);
}

/* ===================================================================== */
/*  VIEW: AGENTS                                                           */
/* ===================================================================== */
function renderAgents() {
  dom.views.agents.innerHTML = `<div class="agent-grid">${state.agents.map(agentCard).join('')}</div>`;
}

function agentCard(ag) {
  return `
    <article class="agent">
      <div class="agent-top">
        <button class="agent-id" data-act="open-agent" data-id="${ag.id}">
          <span class="avatar lg ${ag.status}">${initials(ag.codename)}</span>
          <span class="agent-name-wrap">
            <span class="agent-lane eyebrow">${esc(ag.lane)}</span>
            <span class="agent-name">${esc(ag.codename)}</span>
            <span class="agent-role">${esc(ag.role)}</span>
          </span>
        </button>
        <span class="badge ${ag.status}">${statusLabel(ag.status)}</span>
      </div>
      <p class="agent-mission">${esc(ag.mission)}</p>
      <div class="agent-next"><span class="eyebrow">Next</span> ${esc(ag.next)}</div>
      ${ag.blocker ? `<div class="agent-blocker">⛔ ${esc(ag.blocker)}</div>` : ''}
      <div class="agent-stats">
        <span title="Confidence">⌁ ${Math.round(ag.confidence * 100)}%</span>
        <span title="Last run">↻ ${relTime(ag.lastRun)}</span>
        <span title="Progress">▰ ${ag.progress}%</span>
      </div>
      <div class="progress"><span style="width:${ag.progress}%"></span></div>
      <div class="agent-actions">
        <button class="btn btn-ghost btn-small" data-act="agent" data-op="poke" data-id="${ag.id}">Poke</button>
        <button class="btn btn-ghost btn-small" data-act="agent" data-op="work" data-id="${ag.id}">Work</button>
        <button class="btn btn-ghost btn-small" data-act="agent" data-op="pause" data-id="${ag.id}">Pause</button>
        <button class="btn btn-ghost btn-small warn" data-act="agent" data-op="escalate" data-id="${ag.id}">Escalate</button>
        <button class="btn btn-primary btn-small" data-act="agent" data-op="finish" data-id="${ag.id}">Finish step</button>
      </div>
    </article>`;
}

/* ===================================================================== */
/*  VIEW: QUEUE                                                            */
/* ===================================================================== */
function renderQueue() {
  let items = state.tasks.filter((t) => {
    if (queueFilter === 'all') return true;
    if (queueFilter === 'active') return t.stage === 'in_progress';
    if (queueFilter === 'blocked') return t.stage === 'blocked';
    if (queueFilter === 'done') return t.stage === 'shipped';
    return true;
  });
  if (state.meta.sortByPriority) items = [...items].sort((a, b) => pScore(a.priority) - pScore(b.priority) || a.dueIn - b.dueIn);

  const filters = ['all', 'active', 'blocked', 'done'].map((f) =>
    `<button class="chip ${queueFilter === f ? 'on' : ''}" data-act="queue-filter" data-filter="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`
  ).join('');

  dom.views.queue.innerHTML = `
    <div class="queue-bar">
      <div class="chips">${filters}</div>
      <button class="btn btn-ghost btn-small" data-act="sort-queue">${state.meta.sortByPriority ? '✓ Sorted by priority' : 'Sort by priority'}</button>
    </div>
    <div class="qtable">
      <div class="qhead">
        <span>Task</span><span>Owner</span><span>Lane</span><span>Priority</span><span>Stage</span><span>Due</span><span>Actions</span>
      </div>
      ${items.map(queueRow).join('') || `<div class="kcol-empty">No tasks match this filter.</div>`}
    </div>`;
}

function queueRow(t) {
  const ag = agentById(t.owner);
  return `
    <div class="qrow ${t.stage === 'blocked' ? 'is-blocked' : ''}">
      <button class="qtitle" data-act="open-task" data-id="${t.id}">${esc(t.title)}<small>${esc(t.detail)}</small></button>
      <span class="owner"><span class="avatar xs">${ag ? initials(ag.codename) : '?'}</span><span class="hide-sm">${ag ? esc(ag.codename) : t.owner}</span></span>
      <span class="lane-chip">${esc(t.lane)}</span>
      <span><span class="ptag p${t.priority[1]}">${t.priority}</span></span>
      <span class="stage-chip st-${t.stage}">${stageLabel(t.stage)}</span>
      <span class="due ${t.stage !== 'shipped' && t.dueIn <= 1 ? 'hot' : ''}">${t.stage === 'shipped' ? '—' : t.dueIn + 'd'}</span>
      <span class="qactions">
        <button class="btn btn-ghost btn-tiny" data-act="task" data-op="done" data-id="${t.id}" ${t.stage === 'shipped' ? 'disabled' : ''}>Done</button>
        <button class="btn btn-ghost btn-tiny" data-act="task" data-op="defer" data-id="${t.id}">Defer</button>
        <button class="btn btn-ghost btn-tiny" data-act="task" data-op="rerun" data-id="${t.id}">Rerun</button>
      </span>
    </div>`;
}

/* ===================================================================== */
/*  VIEW: DECISIONS                                                        */
/* ===================================================================== */
function renderDecisions() {
  const open = state.decisions.filter((d) => d.status === 'open');
  const closed = state.decisions.filter((d) => d.status !== 'open');
  dom.views.decisions.innerHTML = `
    <div class="stack wide">${decisionsHTML(open, false) || '<div class="kcol-empty">Inbox zero. No decisions waiting on you.</div>'}</div>
    ${closed.length ? `<div class="closed-head"><span class="eyebrow">Resolved (${closed.length})</span><button class="link" data-act="clear-decisions">Clear resolved</button></div>
      <div class="stack wide muted">${closed.map(closedDecision).join('')}</div>` : ''}`;
}

function decisionsHTML(list, compact) {
  return list.map((d) => {
    const ag = agentById(d.requestedBy);
    return `
    <article class="decision urgency-${d.urgency}">
      <div class="decision-head">
        <div>
          <span class="urgency-tag ${d.urgency}">${d.urgency}</span>
          <strong>${esc(d.title)}</strong>
        </div>
        ${ag ? `<span class="req">↳ ${esc(ag.codename)}</span>` : ''}
      </div>
      <p>${esc(d.detail)}</p>
      <div class="decision-actions">
        <button class="btn btn-primary btn-small" data-act="decision" data-op="resolve" data-id="${d.id}">Resolve</button>
        <button class="btn btn-ghost btn-small good" data-act="decision" data-op="approve" data-id="${d.id}">Approve</button>
        <button class="btn btn-ghost btn-small warn" data-act="decision" data-op="reject" data-id="${d.id}">Reject</button>
        ${compact ? '' : `<button class="btn btn-ghost btn-small" data-act="decision" data-op="sendback" data-id="${d.id}">Send back</button>`}
        <button class="btn btn-ghost btn-small" data-act="decision" data-op="keep" data-id="${d.id}">Keep open</button>
      </div>
    </article>`;
  }).join('');
}

function closedDecision(d) {
  return `<article class="decision closed"><div class="decision-head"><strong>${esc(d.title)}</strong><span class="resolved-tag ${d.status}">${d.status}</span></div></article>`;
}

/* ===================================================================== */
/*  VIEW: ALERTS                                                           */
/* ===================================================================== */
function renderAlerts() {
  dom.views.alerts.innerHTML = state.alerts.length
    ? `<div class="stack wide">${alertsHTML(state.alerts)}</div>`
    : `<div class="kcol-empty">All clear. No alerts or blockers.</div>`;
}

function alertsHTML(list) {
  return list.map((al) => {
    const ag = agentById(al.relatedId);
    return `
    <article class="alert sev-${al.severity}">
      <span class="alert-rail"></span>
      <div class="alert-body">
        <div class="alert-head">
          <span class="alert-type">${esc(al.type)}</span>
          <span class="sev-tag ${al.severity}">${al.severity}</span>
        </div>
        <strong>${esc(al.title)}</strong>
        <p>${esc(al.detail)}</p>
        <div class="alert-actions">
          ${ag ? `<button class="btn btn-ghost btn-tiny" data-act="open-agent" data-id="${ag.id}">Open ${esc(ag.codename)}</button>` : ''}
          <button class="btn btn-ghost btn-tiny" data-act="dismiss-alert" data-id="${al.id}">Dismiss</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

/* ===================================================================== */
/*  VIEW: SOULS                                                            */
/* ===================================================================== */
function renderSouls() {
  const souls = window.LUINUS_SOULS;
  dom.views.souls.innerHTML = `<div class="soul-grid">${state.agents.map((ag) => {
    const s = souls[ag.id];
    if (!s) return '';
    return `
    <article class="soul">
      <div class="soul-head">
        <span class="avatar lg ${ag.status}">${initials(s.codename)}</span>
        <div>
          <div class="soul-name">${esc(s.codename)} <span class="soul-role">· ${esc(ag.role)}</span></div>
          <div class="soul-tagline">${esc(s.tagline)}</div>
        </div>
      </div>
      <div class="soul-directive"><span class="eyebrow">Prime directive</span><p>${esc(s.directive)}</p></div>
      <div class="soul-sec"><span class="eyebrow">Operating principles</span><ul>${s.principles.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
      <div class="soul-sec"><span class="eyebrow">Tools</span><div class="tool-tags">${s.tools.map((t) => `<span class="tool-tag">${esc(t)}</span>`).join('')}</div></div>
      <div class="soul-rights">
        <div><span class="eyebrow good">Decides</span><ul>${s.decide.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div><span class="eyebrow warn">Escalates</span><ul>${s.escalate.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      <div class="soul-voice">“${esc(stripQuotes(s.voice))}”</div>
      <a class="soul-link" href="${s.file}" target="_blank" rel="noopener">Read full soul.md →</a>
    </article>`;
  }).join('')}</div>`;
}

/* ===================================================================== */
/*  DRAWER (drill-down)                                                    */
/* ===================================================================== */
function openAgentDrawer(id) {
  const ag = agentById(id);
  if (!ag) return;
  const s = window.LUINUS_SOULS[id];
  const tasks = state.tasks.filter((t) => t.owner === id);
  const acts = state.activity.filter((x) => x.actor.includes(ag.codename)).slice(0, 5);
  dom.drawerInner.innerHTML = `
    <div class="drawer-head">
      <div class="drawer-id">
        <span class="avatar xl ${ag.status}">${initials(ag.codename)}</span>
        <div>
          <div class="eyebrow">${esc(ag.lane)} lane</div>
          <h2>${esc(ag.codename)}</h2>
          <div class="agent-role">${esc(ag.name)} · ${esc(ag.role)}</div>
        </div>
      </div>
      <button class="drawer-close" data-act="close-drawer">✕</button>
    </div>
    <div class="drawer-tags">
      <span class="badge ${ag.status}">${statusLabel(ag.status)}</span>
      <span class="kv">Confidence ${Math.round(ag.confidence * 100)}%</span>
      <span class="kv">Progress ${ag.progress}%</span>
      <span class="kv">Last run ${relTime(ag.lastRun)}</span>
    </div>
    <div class="progress big"><span style="width:${ag.progress}%"></span></div>

    <div class="drawer-sec"><span class="eyebrow">Mission</span><p>${esc(ag.mission)}</p></div>
    <div class="drawer-sec"><span class="eyebrow">Next action</span><p>${esc(ag.next)}</p></div>
    ${ag.blocker ? `<div class="agent-blocker">⛔ ${esc(ag.blocker)}</div>` : ''}

    <div class="drawer-io">
      <div><span class="eyebrow">Inputs</span><p>${esc(ag.io.inputs)}</p></div>
      <div><span class="eyebrow">Outputs</span><p>${esc(ag.io.outputs)}</p></div>
      <div><span class="eyebrow ${ag.io.errors.toLowerCase().includes('none') ? '' : 'warn'}">Errors</span><p>${esc(ag.io.errors)}</p></div>
    </div>

    <div class="drawer-sec"><span class="eyebrow">Tools</span><div class="tool-tags">${ag.tools.map((t) => `<span class="tool-tag">${esc(t)}</span>`).join('')}</div></div>

    <div class="drawer-sec"><span class="eyebrow">Related tasks (${tasks.length})</span>
      <div class="mini-list">${tasks.map((t) => `<button class="mini-row" data-act="open-task" data-id="${t.id}"><span class="ptag p${t.priority[1]}">${t.priority}</span> ${esc(t.title)} <span class="stage-chip st-${t.stage}">${stageLabel(t.stage)}</span></button>`).join('') || '<p class="subtle">None</p>'}</div>
    </div>

    <div class="drawer-sec"><span class="eyebrow">Recent timeline</span>
      <div class="activity">${acts.length ? activityHTML(acts) : '<p class="subtle">No recent moves.</p>'}</div>
    </div>

    <div class="drawer-actions">
      <button class="btn btn-ghost btn-small" data-act="agent" data-op="poke" data-id="${ag.id}">Poke</button>
      <button class="btn btn-ghost btn-small" data-act="agent" data-op="work" data-id="${ag.id}">Work</button>
      <button class="btn btn-ghost btn-small warn" data-act="agent" data-op="escalate" data-id="${ag.id}">Escalate</button>
      <button class="btn btn-primary btn-small" data-act="agent" data-op="finish" data-id="${ag.id}">Finish step</button>
      ${s ? `<a class="btn btn-ghost btn-small" href="${s.file}" target="_blank" rel="noopener">soul.md →</a>` : ''}
    </div>`;
  openDrawer();
}

function openTaskDrawer(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  const ag = agentById(t.owner);
  dom.drawerInner.innerHTML = `
    <div class="drawer-head">
      <div class="drawer-id">
        <span class="ptag big p${t.priority[1]}">${t.priority}</span>
        <div><div class="eyebrow">${esc(t.lane)} · ${stageLabel(t.stage)}</div><h2>${esc(t.title)}</h2></div>
      </div>
      <button class="drawer-close" data-act="close-drawer">✕</button>
    </div>
    <div class="drawer-tags">
      <span class="stage-chip st-${t.stage}">${stageLabel(t.stage)}</span>
      <span class="kv">Owner ${ag ? esc(ag.codename) : t.owner}</span>
      <span class="kv ${t.stage !== 'shipped' && t.dueIn <= 1 ? 'hot' : ''}">${t.stage === 'shipped' ? 'Shipped' : 'Due in ' + t.dueIn + 'd'}</span>
    </div>
    <div class="drawer-sec"><span class="eyebrow">Detail</span><p>${esc(t.detail)}</p></div>
    <div class="drawer-sec"><span class="eyebrow">Notes</span><p>${esc(t.notes || '—')}</p></div>
    <div class="drawer-sec"><span class="eyebrow">Dependencies</span>${t.deps && t.deps.length ? `<div class="tool-tags">${t.deps.map((d) => `<span class="tool-tag dep">⛓ ${esc(d)}</span>`).join('')}</div>` : '<p class="subtle">None — unblocked.</p>'}</div>

    <div class="drawer-sec"><span class="eyebrow">Move to stage</span>
      <div class="stage-picker">${STAGES.map((s) => `<button class="chip ${t.stage === s.id ? 'on' : ''}" data-act="set-stage" data-id="${t.id}" data-stage="${s.id}">${s.label}</button>`).join('')}</div>
    </div>

    <div class="drawer-actions">
      <button class="btn btn-primary btn-small" data-act="task" data-op="done" data-id="${t.id}" ${t.stage === 'shipped' ? 'disabled' : ''}>Mark done</button>
      <button class="btn btn-ghost btn-small" data-act="task" data-op="defer" data-id="${t.id}">Defer</button>
      <button class="btn btn-ghost btn-small" data-act="task" data-op="rerun" data-id="${t.id}">Rerun</button>
      ${ag ? `<button class="btn btn-ghost btn-small" data-act="open-agent" data-id="${ag.id}">Open ${esc(ag.codename)}</button>` : ''}
    </div>`;
  openDrawer();
}

function openDrawer() { dom.drawer.classList.add('open'); dom.drawerBackdrop.classList.add('show'); dom.drawer.setAttribute('aria-hidden', 'false'); }
function closeDrawer() { dom.drawer.classList.remove('open'); dom.drawerBackdrop.classList.remove('show'); dom.drawer.setAttribute('aria-hidden', 'true'); }

/* ===================================================================== */
/*  ACTIONS                                                                */
/* ===================================================================== */
function bindGlobalActions() {
  dom.nav.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (item) setView(item.dataset.view);
  });
  dom.refreshBtn.addEventListener('click', () => { refreshCycle(); });
  dom.exportBtn.addEventListener('click', exportSnapshot);
  dom.autopilotToggle.addEventListener('click', toggleAutopilot);
  dom.drawerBackdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  // Delegated clicks for everything with data-act.
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const id = el.dataset.id;
    switch (act) {
      case 'goto': setView(el.dataset.view); break;
      case 'rec-go': recommendation().go(); break;
      case 'open-agent': openAgentDrawer(id); break;
      case 'open-task': openTaskDrawer(id); break;
      case 'close-drawer': closeDrawer(); break;
      case 'agent': agentAction(id, el.dataset.op); break;
      case 'task': taskAction(id, el.dataset.op); break;
      case 'set-stage': moveTaskStage(id, el.dataset.stage); openTaskDrawer(id); break;
      case 'decision': decisionAction(id, el.dataset.op); break;
      case 'queue-filter': queueFilter = el.dataset.filter; renderQueue(); break;
      case 'sort-queue': state.meta.sortByPriority = !state.meta.sortByPriority; commit(); break;
      case 'clear-decisions': state.decisions = state.decisions.filter((d) => d.status === 'open'); commit(); toast('Cleared resolved.'); break;
      case 'dismiss-alert': state.alerts = state.alerts.filter((a) => a.id !== id); pushActivity(systemActor(), 'Alert dismissed.', 'orchestration'); commit(); break;
      case 'advance': advanceCycle(); break;
    }
  });
}

function agentAction(id, op) {
  const ag = agentById(id);
  if (!ag) return;
  ag.lastRun = new Date().toISOString();
  if (op === 'poke') { ag.status = ag.status === 'blocked' ? 'blocked' : 'live'; ag.progress = clamp(ag.progress + 5); pushActivity(actor(ag), `${ag.codename} was poked.`, ag.lane.toLowerCase()); }
  if (op === 'work') { if (ag.status !== 'blocked') ag.status = 'live'; ag.progress = clamp(ag.progress + 11); ag.confidence = clamp01(ag.confidence + 0.03); pushActivity(actor(ag), `${ag.codename} is working the lane.`, ag.lane.toLowerCase()); }
  if (op === 'pause') { ag.status = 'idle'; pushActivity(actor(ag), `${ag.codename} paused.`, ag.lane.toLowerCase()); }
  if (op === 'escalate') {
    ag.status = 'blocked';
    state.decisions.unshift({ id: 'd' + Date.now(), title: `Escalation from ${ag.codename}`, detail: ag.blocker || `${ag.codename} needs a founder call to proceed.`, owner: 'Founder', urgency: 'high', requestedBy: ag.id, status: 'open' });
    pushActivity(actor(ag), `${ag.codename} escalated to the founder.`, ag.lane.toLowerCase());
    toast(`${ag.codename} escalated — added to your inbox.`);
  }
  if (op === 'finish') {
    ag.status = 'done'; ag.progress = 100; ag.confidence = clamp01(ag.confidence + 0.05);
    const t = state.tasks.find((x) => x.owner === id && x.stage !== 'shipped');
    if (t) { t.stage = 'shipped'; pushActivity(actor(ag), `${ag.codename} finished a step — shipped “${t.title}”.`, ag.lane.toLowerCase()); }
    else pushActivity(actor(ag), `${ag.codename} completed a step.`, ag.lane.toLowerCase());
  }
  reconcileAlerts();
  commit();
  if (dom.drawer.classList.contains('open')) openAgentDrawer(id);
}

function taskAction(id, op) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  if (op === 'done') { t.stage = 'shipped'; pushActivity(systemActor(), `Marked done: ${t.title}.`, t.lane.toLowerCase()); toast(`Shipped “${t.title}”.`); }
  if (op === 'defer') { t.dueIn += 2; t.priority = t.priority === 'P0' ? 'P1' : 'P2'; pushActivity(systemActor(), `Deferred: ${t.title}.`, t.lane.toLowerCase()); }
  if (op === 'rerun') { t.stage = 'in_progress'; const ag = agentById(t.owner); if (ag && ag.status !== 'blocked') ag.status = 'live'; pushActivity(systemActor(), `Re-queued: ${t.title}.`, t.lane.toLowerCase()); }
  reconcileAlerts();
  commit();
  if (dom.drawer.classList.contains('open')) openTaskDrawer(id);
}

function decisionAction(id, op) {
  const d = state.decisions.find((x) => x.id === id);
  if (!d) return;
  if (op === 'keep') { pushActivity(systemActor(), `Kept open: ${d.title}.`, 'orchestration'); commit(); return; }
  d.status = op === 'reject' ? 'rejected' : op === 'sendback' ? 'sent back' : 'resolved';
  // Resolving the pricing decision unblocks Sales.
  if (d.requestedBy) {
    const ag = agentById(d.requestedBy);
    if (ag && op !== 'sendback') {
      if (ag.status === 'blocked') { ag.status = 'live'; ag.blocker = null; ag.progress = clamp(ag.progress + 8); }
      const t = state.tasks.find((x) => x.owner === ag.id && x.stage === 'blocked');
      if (t && op !== 'reject') { t.stage = 'in_progress'; t.deps = []; }
    }
  }
  pushActivity(systemActor(), `Decision ${d.status}: ${d.title}.`, 'orchestration');
  reconcileAlerts();
  commit();
  toast(`Decision ${d.status}.`);
}

/* --------------------------------------------------------- cycle engine */
function refreshCycle() {
  state.agents.forEach((ag, i) => {
    if (ag.status === 'blocked') return;
    const roll = Math.random();
    if (i === 0) ag.status = 'live';
    else if (ag.status === 'done') ag.status = roll > 0.5 ? 'idle' : 'live';
    else ag.status = roll > 0.7 ? 'idle' : roll > 0.25 ? 'live' : ag.status;
    ag.progress = clamp(ag.progress + Math.round(Math.random() * 5 - 1));
    ag.lastRun = new Date().toISOString();
  });
  pushActivity(systemActor(), 'Refresh cycle: COO synced every lane.', 'orchestration');
  reconcileAlerts();
  commit();
  toast('Cycle refreshed.');
}

function advanceCycle() {
  // Push one piece of work forward through the pipeline.
  const order = ['backlog', 'in_progress', 'review'];
  const movable = state.tasks.find((t) => order.includes(t.stage) && t.stage !== 'blocked');
  if (movable) {
    const next = movable.stage === 'backlog' ? 'in_progress' : movable.stage === 'in_progress' ? 'review' : 'shipped';
    const from = movable.stage; movable.stage = next;
    pushActivity(systemActor(), `Advanced “${movable.title}” ${stageLabel(from)} → ${stageLabel(next)}.`, movable.lane.toLowerCase());
  }
  const live = state.agents.find((a) => a.status !== 'done' && a.status !== 'blocked');
  if (live) { live.progress = clamp(live.progress + 7); live.status = 'live'; live.lastRun = new Date().toISOString(); }
  reconcileAlerts();
  commit();
  toast('Company cycle advanced.');
}

/* ----------------------------------------------------------- autopilot */
function toggleAutopilot() {
  state.meta.autopilot = !state.meta.autopilot;
  if (state.meta.autopilot) startAutopilot(); else stopAutopilot();
  syncAutopilotUI();
  save();
}
function startAutopilot(silent) {
  state.meta.autopilot = true;
  if (autopilotTimer) clearInterval(autopilotTimer);
  autopilotTimer = setInterval(autopilotTick, 6000);
  if (!silent) { pushActivity(systemActor(), 'Autopilot engaged — agents are running 24/7.', 'orchestration'); commit(); toast('24/7 Autopilot ON.'); }
}
function stopAutopilot() {
  state.meta.autopilot = false;
  if (autopilotTimer) clearInterval(autopilotTimer);
  autopilotTimer = null;
  pushActivity(systemActor(), 'Autopilot paused.', 'orchestration');
  commit();
  toast('Autopilot paused.');
}
function syncAutopilotUI() {
  dom.autopilotToggle.classList.toggle('on', state.meta.autopilot);
  dom.autopilotToggle.setAttribute('aria-checked', String(state.meta.autopilot));
  dom.autopilotSub.textContent = state.meta.autopilot ? 'Running · agents active' : 'Paused';
}
function autopilotTick() {
  const live = state.agents.filter((a) => a.status !== 'blocked');
  const ag = live[Math.floor(Math.random() * live.length)];
  if (ag) {
    ag.status = 'live'; ag.progress = clamp(ag.progress + Math.round(Math.random() * 6 + 2)); ag.lastRun = new Date().toISOString();
    if (ag.progress >= 100) { ag.status = 'done'; }
  }
  // Occasionally move a task forward.
  if (Math.random() > 0.45) {
    const t = state.tasks.find((x) => ['backlog', 'in_progress', 'review'].includes(x.stage));
    if (t) { const from = t.stage; t.stage = from === 'backlog' ? 'in_progress' : from === 'in_progress' ? 'review' : 'shipped';
      pushActivity(actor(agentById(t.owner) || {}), `Autopilot moved “${t.title}” → ${stageLabel(t.stage)}.`, t.lane.toLowerCase()); }
  } else if (ag) {
    pushActivity(actor(ag), `${ag.codename} advanced its lane (+progress).`, ag.lane.toLowerCase());
  }
  reconcileAlerts();
  commit();
}

/* ----------------------------------------------------------- alerts sync */
function reconcileAlerts() {
  // Keep derived blocker alerts honest; preserve seeded/manual ones not derivable.
  const derived = [];
  state.agents.filter((a) => a.status === 'blocked').forEach((a) =>
    derived.push({ id: 'blk-' + a.id, type: 'Blocked lane', title: `${a.codename} is blocked`, detail: a.blocker || `${a.name} cannot proceed without a decision.`, severity: 'critical', relatedId: a.id }));
  // Stale: idle and last run > 45m
  state.agents.filter((a) => a.status === 'idle' && minutesSince(a.lastRun) > 45).forEach((a) =>
    derived.push({ id: 'stale-' + a.id, type: 'Stale agent', title: `${a.codename} idle ${Math.round(minutesSince(a.lastRun))}m`, detail: 'Lane is overdue for a run.', severity: 'warn', relatedId: a.id }));
  const manual = state.alerts.filter((a) => !a.id.startsWith('blk-') && !a.id.startsWith('stale-') && !['al1', 'al4'].includes(a.id));
  state.alerts = [...derived, ...manual];
}

/* ------------------------------------------------------------- export */
async function exportSnapshot() {
  const snap = {
    exportedAt: new Date().toISOString(),
    metrics: metrics(),
    agents: state.agents.map((a) => ({ codename: a.codename, status: a.status, progress: a.progress, confidence: a.confidence })),
    tasks: state.tasks.map((t) => ({ title: t.title, stage: t.stage, priority: t.priority, owner: t.owner })),
    decisions: state.decisions,
    alerts: state.alerts,
    activity: state.activity,
  };
  const text = JSON.stringify(snap, null, 2);
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `luinus-snapshot-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    if (navigator.clipboard) await navigator.clipboard.writeText(text).catch(() => {});
    toast('Snapshot exported + copied.');
  } catch (_) {
    toast('Snapshot ready (download blocked).');
  }
  pushActivity(systemActor(), 'Founder exported a company snapshot.', 'orchestration');
  commit();
}

/* ---------------------------------------------------------------- utils */
function agentById(id) { return state.agents.find((a) => a.id === id); }
function actor(ag) { return ag && ag.codename ? `${ag.codename} (${roleShort(ag)})` : systemActor(); }
function roleShort(ag) { return ({ coo: 'COO', sales: 'Sales', marketing: 'Mktg', product: 'Product', ops: 'Ops', qa: 'QA', research: 'Research', support: 'CS' })[ag.id] || ag.lane; }
function systemActor() { return 'Atlas (COO)'; }

function pushActivity(actorName, message, type) {
  state.activity.unshift({ id: 'a' + Date.now() + Math.random().toString(16).slice(2, 6), time: new Date().toISOString(), actor: actorName, type: type || 'orchestration', message });
  state.activity = state.activity.slice(0, 40);
}

function activityHTML(list) {
  return list.map((a) => `
    <div class="activity-item">
      <span class="act-dot type-${esc(a.type || 'orchestration')}"></span>
      <div class="act-body">
        <div class="act-msg">${esc(a.message)}</div>
        <div class="act-meta"><span>${esc(a.actor)}</span><time>${relTime(a.time)}</time></div>
      </div>
    </div>`).join('');
}

function tile(label, value, tone, hint) {
  return `<div class="tile ${tone}"><div class="tile-label">${esc(label)}</div><div class="tile-value">${esc(value)}</div><div class="tile-hint">${esc(hint)}</div></div>`;
}

function startClock() {
  const upd = () => {
    dom.clockPill.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  upd();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(upd, 1000);
}

function toast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => dom.toast.classList.remove('show'), 2200);
}

function statusLabel(s) { return ({ live: 'Live', idle: 'Idle', blocked: 'Blocked', waiting: 'Waiting', done: 'Done' })[s] || s; }
function stageLabel(s) { return (STAGES.find((x) => x.id === s) || {}).label || s; }
function pScore(p) { return p === 'P0' ? 0 : p === 'P1' ? 1 : 2; }
function clamp(v) { return Math.min(100, Math.max(0, Math.round(v))); }
function clamp01(v) { return Math.min(1, Math.max(0, v)); }
function initials(name) { return (name || '?').slice(0, 2).toUpperCase(); }
function relTime(iso) {
  const mins = minutesSince(iso);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
function minutesSince(iso) { return (Date.now() - new Date(iso).getTime()) / 60000; }
function stripQuotes(s) { return (s || '').replace(/^[“"']|[”"']$/g, ''); }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
