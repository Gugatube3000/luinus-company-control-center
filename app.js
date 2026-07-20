/* Luinus Growth Engine — application logic
 * Vanilla JS SPA, no build step. Focused on automated outreach:
 * leads → copy → email/LinkedIn at volume → replies → booked demos.
 * State persists to localStorage; swap SEED in data.js for live data later.
 */

'use strict';

const STORAGE_KEY = 'luinus-growth-engine:v1';
const PIPELINE = [
  { id: 'sourced', label: 'Sourced' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'replied', label: 'Replied' },
  { id: 'booked', label: 'Booked' },
  { id: 'won', label: 'Won' },
  { id: 'passed', label: 'Passed' },
];
const VIEWS = {
  command: { title: 'Command', sub: "Tell the team what to do — and see what's already working." },
  campaigns: { title: 'Campaigns', sub: 'Every outreach campaign the team is running, 24/7.' },
  pipeline: { title: 'Pipeline', sub: 'Every doctor in motion — drag a card as it progresses.' },
  inbox: { title: 'Inbox', sub: 'Replies and approvals that need a human. Clear these first.' },
  playbooks: { title: 'Playbooks', sub: 'Proven outreach plays. Deploy one as a campaign in a click.' },
  team: { title: 'Teams', sub: 'Switch between teams. Each agent is actionable.' },
  souls: { title: 'Souls', sub: 'The operating contract each agent carries into every run.' },
};

let state = loadState();
let currentView = 'command';
let activeTeam = (state.teams && state.teams[0] && state.teams[0].id) || 'outreach';
let composerText = '';
let autopilotTimer = null;
let clockTimer = null;

const $ = (id) => document.getElementById(id);
const dom = {
  views: Object.fromEntries(Object.keys(VIEWS).map((k) => [k, $('view-' + k)])),
  viewTitle: $('viewTitle'), viewSubtitle: $('viewSubtitle'),
  nav: $('nav'), navCampaigns: $('navCampaigns'), navInbox: $('navInbox'),
  autopilotToggle: $('autopilotToggle'), autopilotSub: $('autopilotSub'),
  clockPill: $('clockPill'), sidebarStatus: $('sidebarStatus'),
  refreshBtn: $('refreshBtn'), exportBtn: $('exportBtn'),
  drawer: $('drawer'), drawerInner: $('drawerInner'), drawerBackdrop: $('drawerBackdrop'),
  toast: $('toast'),
};

init();

function init() {
  bindGlobal();
  setView(location.hash.replace('#', '') || 'command');
  startClock();
  if (state.meta.autopilot) startAutopilot(true);
  syncAutopilotUI();
}

/* --------------------------------------------------------------- state */
function loadState() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch (_) {}
  return structuredClone(window.LUINUS_SEED);
}
function save() { state.meta.lastRefresh = new Date().toISOString(); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} }
function commit() { save(); renderCurrentView(); renderChrome(); }

/* --------------------------------------------------------------- routing */
function setView(name) {
  if (!VIEWS[name]) name = 'command';
  currentView = name;
  location.hash = name;
  Object.entries(dom.views).forEach(([k, el]) => el.classList.toggle('active', k === name));
  dom.nav.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  dom.viewTitle.textContent = VIEWS[name].title;
  dom.viewSubtitle.textContent = VIEWS[name].sub;
  renderCurrentView();
  renderChrome();
  dom.views[name].parentElement.scrollTop = 0;
}
function renderCurrentView() {
  ({ command: renderCommand, campaigns: renderCampaigns, pipeline: renderPipeline,
     inbox: renderInbox, playbooks: renderPlaybooks, team: renderTeam, souls: renderSouls })[currentView]();
}

/* --------------------------------------------------------------- metrics */
function metrics() {
  const live = state.campaigns.filter((c) => c.status === 'live');
  const emailsToday = sum(live.filter((c) => c.channel === 'email').map((c) => c.sentToday));
  const dmsToday = sum(live.filter((c) => c.channel === 'linkedin').map((c) => c.sentToday));
  const totalSent = sum(state.campaigns.map((c) => c.totalSent));
  const replies = sum(state.campaigns.map((c) => c.replies));
  const booked = sum(state.campaigns.map((c) => c.booked));
  const won = state.leads.filter((l) => l.stage === 'won').length;
  return {
    emailsToday, dmsToday, totalSent, replies, booked, won,
    replyRate: totalSent ? (replies / totalSent * 100) : 0,
    activeCampaigns: live.length,
    openApprovals: state.inbox.filter((i) => i.status === 'open').length,
    leadsInPlay: state.leads.filter((l) => !['won', 'passed'].includes(l.stage)).length,
  };
}

function nextAction() {
  const m = metrics();
  const hot = state.inbox.find((i) => i.status === 'open' && i.urgency === 'high');
  if (hot) return { label: 'Needs you now', text: hot.title, detail: hot.detail, go: () => setView('inbox') };
  const copy = state.inbox.find((i) => i.status === 'open' && i.type === 'approve-copy');
  if (copy) return { label: 'Unblock a launch', text: copy.title, detail: copy.detail, go: () => setView('inbox') };
  if (m.openApprovals) return { label: 'Clear the inbox', text: `${m.openApprovals} item(s) waiting`, detail: 'Approve replies and copy so the team keeps moving.', go: () => setView('inbox') };
  const draft = state.campaigns.find((c) => c.status === 'draft');
  if (draft) return { label: 'Launch more volume', text: `“${draft.name}” is ready`, detail: 'Approve and launch it to add outbound volume.', go: () => setView('campaigns') };
  return { label: 'Momentum', text: 'Outreach is flowing', detail: 'Inbox is clear. Tell the team to scale a winning campaign.', go: () => setView('command') };
}

/* --------------------------------------------------------------- chrome */
function renderChrome() {
  const m = metrics();
  dom.navCampaigns.textContent = m.activeCampaigns || '';
  dom.navCampaigns.style.display = m.activeCampaigns ? '' : 'none';
  dom.navInbox.textContent = m.openApprovals || '';
  dom.navInbox.style.display = m.openApprovals ? '' : 'none';
  dom.sidebarStatus.textContent = state.meta.autopilot ? 'Autopilot running' : 'Outreach live · seeded';
}

/* ===================================================================== */
/*  VIEW: COMMAND                                                          */
/* ===================================================================== */
function renderCommand() {
  const m = metrics();
  const g = state.meta.goals;
  const rec = nextAction();
  const tiles = [
    goalTile('Emails sent today', m.emailsToday, g.emailsPerDay, 'tone-info'),
    goalTile('DMs sent today', m.dmsToday, g.dmsPerDay, 'tone-good'),
    statTile('Replies', m.replies, `${m.replyRate.toFixed(1)}% reply rate`, 'tone-good'),
    statTile('Demos booked', m.booked, `${m.won} won`, 'tone-warn'),
    statTile('In pipeline', m.leadsInPlay, 'leads in motion', 'tone-info'),
  ].join('');

  dom.views.command.innerHTML = `
    <section class="composer">
      <div class="composer-head">
        <span class="eyebrow">Tell the team what to do</span>
        <span class="subtle">Plain English. The right agent picks it up.</span>
      </div>
      <textarea id="composerInput" class="composer-input" rows="2" placeholder="e.g. Send 1,000 cold emails to ER physicians in Texas">${esc(composerText)}</textarea>
      <div class="composer-chips" id="composerChips">
        ${chip('Send 1,000 cold emails to ER physicians')}
        ${chip('Send 100 LinkedIn DMs to Medical Directors')}
        ${chip('Find 300 new doctor leads in California')}
        ${chip('Write a 4-step cold email sequence for hospitalists')}
        ${chip('Draft a founder post about ER documentation pain')}
      </div>
      <div class="composer-foot">
        <span class="subtle" id="composerHint">${esc(previewInstruction(composerText))}</span>
        <button class="btn btn-primary" data-act="composer-send">Send to team →</button>
      </div>
    </section>

    <div class="metrics-row five">${tiles}</div>

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
        <div class="panel-head"><div><span class="eyebrow">Needs you</span><h3>Inbox</h3></div>
          <button class="link" data-act="goto" data-view="inbox">View all</button></div>
        <div class="stack">${state.inbox.filter((i) => i.status === 'open').slice(0, 3).map(inboxRow).join('') || '<div class="kcol-empty">Inbox zero — nothing waiting on you.</div>'}</div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><span class="eyebrow">Running now</span><h3>Live campaigns</h3></div>
          <button class="link" data-act="goto" data-view="campaigns">View all</button></div>
        <div class="stack">${state.campaigns.filter((c) => c.status !== 'draft').slice(0, 3).map(campaignMini).join('')}</div>
      </section>
      <section class="panel activity-panel">
        <div class="panel-head"><div><span class="eyebrow">Audit trail</span><h3>Activity</h3></div>
          <span class="subtle">${state.activity.length} recent</span></div>
        <div class="activity">${activityHTML(state.activity.slice(0, 8))}</div>
      </section>
    </div>`;

  const input = $('composerInput');
  input.addEventListener('input', (e) => { composerText = e.target.value; $('composerHint').textContent = previewInstruction(composerText); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComposer(); });
}

function campaignMini(c) {
  const pct = c.goalPerDay ? Math.min(100, Math.round(c.sentToday / c.goalPerDay * 100)) : 0;
  return `<button class="cmini" data-act="open-campaign" data-id="${c.id}">
    <div class="cmini-top"><span class="ch-badge ${c.channel}">${channelIcon(c.channel)}</span><strong>${esc(c.name)}</strong><span class="status-chip st-${c.status}">${c.status}</span></div>
    <div class="goal-bar"><span style="width:${pct}%"></span></div>
    <div class="cmini-meta"><span>${c.sentToday}/${c.goalPerDay || '—'} today</span><span>${c.replies} replies · ${c.booked} booked</span></div>
  </button>`;
}

/* ===================================================================== */
/*  COMPOSER — turn plain English into work                               */
/* ===================================================================== */
function parseInstruction(text) {
  const t = (text || '').toLowerCase().trim();
  if (!t) return null;
  const num = (t.match(/[\d,]+/) || [])[0];
  const count = num ? parseInt(num.replace(/,/g, ''), 10) : null;
  const target = (text.match(/(?:to|for|of)\s+(.+)$/i) || [])[1];
  const icp = target ? target.replace(/[.]+$/, '').trim() : 'your ICP';

  let intent;
  if (/\b(dm|dms|linkedin|connect|message)\b/.test(t)) intent = 'linkedin';
  else if (/\b(email|emails|cold email|inbox|mail)\b/.test(t)) intent = 'email';
  else if (/\b(find|source|leads|list|build|prospect)\b/.test(t)) intent = 'leads';
  else if (/\b(write|copy|sequence|draft|subject)\b/.test(t) && /\b(post|content)\b/.test(t) === false) intent = 'copy';
  else if (/\b(post|content)\b/.test(t)) intent = 'content';
  else intent = 'email';

  return { intent, count, icp };
}

function previewInstruction(text) {
  const p = parseInstruction(text);
  if (!p) return 'The right agent will pick it up.';
  const map = {
    email: `→ Mailer: new email campaign${p.count ? ` (${p.count}/day)` : ''} to ${p.icp}`,
    linkedin: `→ Connector: new LinkedIn campaign${p.count ? ` (${p.count}/day)` : ''} to ${p.icp}`,
    leads: `→ Scout: source${p.count ? ` ${p.count}` : ''} leads (${p.icp})`,
    copy: `→ Scribe: draft a sequence for ${p.icp}`,
    content: `→ Pulse: draft founder content (${p.icp})`,
  };
  return map[p.intent];
}

function submitComposer() {
  const p = parseInstruction(composerText);
  if (!p) { toast('Type an instruction first.'); return; }
  const raw = composerText.trim();

  if (p.intent === 'email' || p.intent === 'linkedin') {
    const owner = p.intent === 'email' ? 'mailer' : 'connector';
    const goal = p.count || (p.intent === 'email' ? 500 : 80);
    const c = {
      id: 'c' + Date.now(), name: titleCase(`${p.icp} — ${p.intent === 'email' ? 'Cold Email' : 'LinkedIn'}`),
      channel: p.intent, owner, icp: titleCase(p.icp), goalPerDay: goal,
      status: p.intent === 'email' ? 'warming' : 'draft',
      sentToday: 0, totalSent: 0, replies: 0, booked: 0,
      infra: p.intent === 'email' ? { domains: Math.max(1, Math.ceil(goal / 100)), inboxes: Math.max(1, Math.ceil(goal / 20)), warmDaysLeft: 14 } : null,
      steps: p.intent === 'email'
        ? [{ day: 1, type: 'email', label: 'Pain + benefit' }, { day: 3, type: 'email', label: 'Proof' }, { day: 6, type: 'email', label: 'Bump' }, { day: 10, type: 'email', label: 'Breakup' }]
        : [{ day: 0, type: 'engage', label: 'Pre-engage' }, { day: 2, type: 'connect', label: 'Connect + note' }, { day: 3, type: 'dm', label: 'Value DM' }, { day: 6, type: 'dm', label: 'Follow-up' }],
      createdAt: new Date().toISOString(),
    };
    state.campaigns.unshift(c);
    state.inbox.unshift({ id: 'i' + Date.now(), type: 'approve-copy', title: `Approve copy for “${c.name}”`, detail: `Scribe will draft the ${p.intent === 'email' ? 'email' : 'DM'} sequence. Approve to ${p.intent === 'email' ? 'launch once warmed' : 'launch'}.`, campaignId: c.id, urgency: 'medium', status: 'open' });
    pushActivity(actorOf(owner), `New ${p.intent === 'email' ? 'email' : 'LinkedIn'} campaign created: ${c.name} (${goal}/day).`, p.intent === 'email' ? 'email' : 'linkedin');
    pushActivity(actorOf('scribe'), `Drafting the sequence for ${c.name}.`, 'copy');
    composerText = '';
    commit(); toast('Campaign created → see Campaigns.'); setView('campaigns');
    return;
  }

  if (p.intent === 'leads') {
    const ag = agent('scout'); ag.status = 'live'; ag.lastRun = now();
    ag.next = `Source ${p.count || 'new'} leads (${titleCase(p.icp)}) and verify.`;
    state.inbox.unshift({ id: 'i' + Date.now(), type: 'approve-leads', title: `Approve ${p.count || 'sourced'} leads (${titleCase(p.icp)})`, detail: 'Scout will source + bounce-check. Approve to load into a campaign.', urgency: 'medium', status: 'open' });
    pushActivity(actorOf('scout'), `Sourcing ${p.count || 'new'} leads: ${titleCase(p.icp)}.`, 'leads');
  } else if (p.intent === 'copy') {
    const ag = agent('scribe'); ag.status = 'live'; ag.lastRun = now();
    ag.next = `Draft a sequence for ${titleCase(p.icp)}.`;
    state.inbox.unshift({ id: 'i' + Date.now(), type: 'approve-copy', title: `Approve sequence copy (${titleCase(p.icp)})`, detail: 'Scribe drafted a sequence. Approve to use it.', urgency: 'medium', status: 'open' });
    pushActivity(actorOf('scribe'), `Drafting a sequence for ${titleCase(p.icp)}.`, 'copy');
  } else { // content
    const ag = agent('pulse'); ag.status = 'live'; ag.lastRun = now();
    ag.next = `Draft founder content: ${titleCase(p.icp)}.`;
    pushActivity(actorOf('pulse'), `Drafting founder content: ${raw}.`, 'marketing');
  }
  composerText = '';
  commit(); toast('Sent to the team → see Inbox.'); setView('inbox');
}

/* ===================================================================== */
/*  VIEW: CAMPAIGNS                                                        */
/* ===================================================================== */
function renderCampaigns() {
  dom.views.campaigns.innerHTML = `<div class="campaign-grid">${state.campaigns.map(campaignCard).join('')}</div>`;
}

function campaignCard(c) {
  const pct = c.goalPerDay ? Math.min(100, Math.round(c.sentToday / c.goalPerDay * 100)) : 0;
  const rate = c.totalSent ? (c.replies / c.totalSent * 100).toFixed(1) : '0.0';
  return `
    <article class="campaign">
      <div class="campaign-top">
        <button class="campaign-id" data-act="open-campaign" data-id="${c.id}">
          <span class="ch-badge ${c.channel}">${channelIcon(c.channel)}</span>
          <span><span class="campaign-name">${esc(c.name)}</span><span class="campaign-icp">${esc(c.icp)}</span></span>
        </button>
        <span class="status-chip st-${c.status}">${c.status}</span>
      </div>
      ${c.status === 'warming' && c.infra ? `<div class="warming-note">🔥 Warming inboxes — ${c.infra.warmDaysLeft} days left before sending</div>` : ''}
      <div class="goal-row">
        <span>${c.sentToday}/${c.goalPerDay || '—'} sent today</span><span>${pct}%</span>
      </div>
      <div class="goal-bar"><span style="width:${pct}%"></span></div>
      <div class="campaign-stats">
        <div><b>${c.totalSent}</b><span>total sent</span></div>
        <div><b>${c.replies}</b><span>replies</span></div>
        <div><b>${c.booked}</b><span>booked</span></div>
        <div><b>${rate}%</b><span>reply rate</span></div>
      </div>
      ${c.infra ? `<div class="infra-note">📮 ${c.infra.domains} domains · ${c.infra.inboxes} inboxes · ~${Math.round((c.goalPerDay || 0) / Math.max(1, c.infra.inboxes))}/inbox/day</div>` : ''}
      <div class="campaign-actions">
        ${c.status === 'live'
          ? `<button class="btn btn-ghost btn-small" data-act="campaign" data-op="pause" data-id="${c.id}">Pause</button>`
          : `<button class="btn btn-primary btn-small" data-act="campaign" data-op="start" data-id="${c.id}">${c.status === 'warming' ? 'Skip warmup & launch' : 'Launch'}</button>`}
        <button class="btn btn-ghost btn-small" data-act="open-campaign" data-id="${c.id}">Details</button>
      </div>
    </article>`;
}

/* ===================================================================== */
/*  VIEW: PIPELINE (kanban of leads)                                      */
/* ===================================================================== */
function renderPipeline() {
  const cols = PIPELINE.map((s) => {
    const items = state.leads.filter((l) => l.stage === s.id);
    return `
      <div class="kcol" data-stage="${s.id}">
        <div class="kcol-head"><div class="kcol-title"><span class="kcol-dot pst-${s.id}"></span>${s.label}</div><span class="kcol-count">${items.length}</span></div>
        <div class="kcol-body" data-stage="${s.id}">${items.map(leadCard).join('') || '<div class="kcol-empty">—</div>'}</div>
      </div>`;
  }).join('');
  dom.views.pipeline.innerHTML = `
    <div class="kanban-bar"><span class="subtle">Drag a doctor across stages, or open a card. The team keeps these moving on Autopilot.</span></div>
    <div class="kanban six">${cols}</div>`;
  wirePipelineDnD();
}

function leadCard(l) {
  return `
    <article class="kcard lead" draggable="true" data-lead-id="${l.id}" data-act="open-lead" data-id="${l.id}">
      <div class="kcard-top"><strong>${esc(l.name)}</strong><span class="ch-badge sm ${l.channel}">${channelIcon(l.channel)}</span></div>
      <div class="lead-title">${esc(l.title)} · ${esc(l.specialty)}</div>
      <div class="lead-org">${esc(l.org)} · ${esc(l.geo)}</div>
      ${l.note ? `<div class="kcard-detail">${esc(l.note)}</div>` : ''}
    </article>`;
}

function wirePipelineDnD() {
  let dragId = null;
  dom.views.pipeline.querySelectorAll('.kcard').forEach((card) => {
    card.addEventListener('dragstart', (e) => { dragId = card.dataset.leadId; card.classList.add('dragging'); e.dataTransfer.setData('text/plain', dragId); });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); dragId = null; });
  });
  dom.views.pipeline.querySelectorAll('.kcol-body').forEach((body) => {
    body.addEventListener('dragover', (e) => { e.preventDefault(); body.classList.add('drop-hot'); });
    body.addEventListener('dragleave', () => body.classList.remove('drop-hot'));
    body.addEventListener('drop', (e) => { e.preventDefault(); body.classList.remove('drop-hot'); moveLead(dragId || e.dataTransfer.getData('text/plain'), body.dataset.stage); });
  });
}

function moveLead(id, stage) {
  const l = state.leads.find((x) => x.id === id);
  if (!l || l.stage === stage) return;
  const from = l.stage; l.stage = stage;
  pushActivity(actorOf('closer'), `${l.name} moved ${stageLabel(from)} → ${stageLabel(stage)}.`, 'pipeline');
  commit(); toast(`${l.name} → ${stageLabel(stage)}`);
}

/* ===================================================================== */
/*  VIEW: INBOX                                                            */
/* ===================================================================== */
function renderInbox() {
  const open = state.inbox.filter((i) => i.status === 'open');
  const done = state.inbox.filter((i) => i.status !== 'open');
  dom.views.inbox.innerHTML = `
    <div class="stack wide">${open.map(inboxCard).join('') || '<div class="kcol-empty">Inbox zero. Nothing needs you right now.</div>'}</div>
    ${done.length ? `<div class="closed-head"><span class="eyebrow">Cleared (${done.length})</span></div>
      <div class="stack wide muted">${done.map((i) => `<article class="decision closed"><div class="decision-head"><strong>${esc(i.title)}</strong><span class="resolved-tag">${i.status}</span></div></article>`).join('')}</div>` : ''}`;
}

function inboxRow(i) {
  return `<button class="inbox-row" data-act="goto" data-view="inbox">
    <span class="itype it-${i.type}">${inboxLabel(i.type)}</span>
    <span class="inbox-row-title">${esc(i.title)}</span>
    <span class="urgency-tag ${i.urgency}">${i.urgency}</span>
  </button>`;
}

function inboxCard(i) {
  const actions = {
    reply: `<button class="btn btn-primary btn-small" data-act="inbox" data-op="approve" data-id="${i.id}">Approve & send</button>
            <button class="btn btn-ghost btn-small" data-act="inbox" data-op="skip" data-id="${i.id}">Skip</button>`,
    objection: `<button class="btn btn-primary btn-small" data-act="inbox" data-op="approve" data-id="${i.id}">Approve answer</button>
                <button class="btn btn-ghost btn-small warn" data-act="inbox" data-op="skip" data-id="${i.id}">Hold</button>`,
    'approve-copy': `<button class="btn btn-primary btn-small" data-act="inbox" data-op="approve" data-id="${i.id}">Approve copy</button>
                     <button class="btn btn-ghost btn-small" data-act="inbox" data-op="skip" data-id="${i.id}">Send back</button>`,
    'approve-leads': `<button class="btn btn-primary btn-small" data-act="inbox" data-op="approve" data-id="${i.id}">Approve leads</button>
                      <button class="btn btn-ghost btn-small warn" data-act="inbox" data-op="skip" data-id="${i.id}">Reject</button>`,
    book: `<button class="btn btn-primary btn-small" data-act="inbox" data-op="approve" data-id="${i.id}">Confirm & book</button>
           <button class="btn btn-ghost btn-small" data-act="inbox" data-op="skip" data-id="${i.id}">Hold</button>`,
  }[i.type];
  return `
    <article class="inbox-card urgency-${i.urgency}">
      <div class="inbox-card-head">
        <span class="itype it-${i.type}">${inboxLabel(i.type)}</span>
        <strong>${esc(i.title)}</strong>
        <span class="urgency-tag ${i.urgency}">${i.urgency}</span>
      </div>
      <p>${esc(i.detail)}</p>
      <div class="decision-actions">${actions}</div>
    </article>`;
}

function inboxAction(id, op) {
  const i = state.inbox.find((x) => x.id === id);
  if (!i) return;
  if (op === 'skip') {
    i.status = i.type === 'approve-leads' ? 'rejected' : i.type === 'approve-copy' ? 'sent back' : 'held';
    pushActivity(actorOf('closer'), `${i.title} — ${i.status}.`, 'pipeline');
  } else {
    i.status = 'approved';
    // Side effects that move the business forward.
    if (i.type === 'reply' && i.leadId) { const l = lead(i.leadId); if (l && l.stage === 'replied') { /* keep */ } pushActivity(actorOf('closer'), `Sent the approved reply to ${l ? l.name : 'lead'}.`, 'pipeline'); }
    if (i.type === 'objection' && i.leadId) { const l = lead(i.leadId); pushActivity(actorOf('closer'), `Answered ${l ? l.name : 'the'} objection (compliance) — back in play.`, 'pipeline'); if (l && l.stage === 'contacted') l.stage = 'replied'; }
    if (i.type === 'book' && i.leadId) { const l = lead(i.leadId); if (l) l.stage = 'booked'; const c = camp(l && l.campaignId); if (c) c.booked++; pushActivity(actorOf('closer'), `Booked a demo with ${l ? l.name : 'lead'}.`, 'pipeline'); unblockAgent('closer'); }
    if (i.type === 'approve-copy') { const c = camp(i.campaignId); if (c && c.status === 'draft') c.status = 'warming'; pushActivity(actorOf('scribe'), `Copy approved${c ? ` for ${c.name}` : ''} — ready to send.`, 'copy'); }
    if (i.type === 'approve-leads') {
      const c = camp(i.campaignId);
      // Drop a couple fresh leads into the pipeline.
      for (let k = 0; k < 2; k++) state.leads.push(freshLead(c));
      pushActivity(actorOf('scout'), `Leads approved — loaded into the pipeline.`, 'leads');
    }
    unblockAgent('closer');
  }
  commit();
  toast(op === 'skip' ? 'Done.' : 'Approved.');
}

/* ===================================================================== */
/*  VIEW: PLAYBOOKS                                                        */
/* ===================================================================== */
function renderPlaybooks() {
  dom.views.playbooks.innerHTML = `<div class="soul-grid">${state.playbooks.map(playbookCard).join('')}</div>`;
}
function playbookCard(p) {
  return `
    <article class="soul playbook">
      <div class="soul-head">
        <span class="ch-badge ${p.channel}">${channelIcon(p.channel)}</span>
        <div><div class="soul-name">${esc(p.title)}</div><div class="soul-tagline">${esc(p.summary)}</div></div>
      </div>
      <div class="soul-sec"><span class="eyebrow">The play</span><ol class="play-steps">${p.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
      <div class="tool-tags">${p.tags.map((t) => `<span class="tool-tag">${esc(t)}</span>`).join('')}</div>
      <div class="drawer-actions">
        ${p.deploy ? `<button class="btn btn-primary btn-small" data-act="deploy-playbook" data-id="${p.id}">Deploy as campaign</button>` : ''}
        <button class="btn btn-ghost btn-small" data-act="copy-playbook" data-id="${p.id}">Copy steps</button>
      </div>
    </article>`;
}
function deployPlaybook(id) {
  const p = state.playbooks.find((x) => x.id === id);
  if (!p || !p.deploy) return;
  const d = p.deploy;
  const c = {
    id: 'c' + Date.now(), name: d.name, channel: d.channel, owner: d.channel === 'email' ? 'mailer' : 'connector',
    icp: d.name, goalPerDay: d.goalPerDay, status: d.channel === 'email' ? 'warming' : 'draft',
    sentToday: 0, totalSent: 0, replies: 0, booked: 0,
    infra: d.channel === 'email' ? { domains: Math.ceil(d.goalPerDay / 100), inboxes: Math.ceil(d.goalPerDay / 20), warmDaysLeft: 14 } : null,
    steps: p.steps.slice(0, 4).map((s, idx) => ({ day: idx, type: d.channel, label: s.slice(0, 40) })),
    createdAt: new Date().toISOString(),
  };
  state.campaigns.unshift(c);
  pushActivity(actorOf(c.owner), `Deployed playbook “${p.title}” as a campaign.`, c.channel === 'email' ? 'email' : 'linkedin');
  commit(); toast('Playbook deployed → Campaigns.'); setView('campaigns');
}
async function copyPlaybook(id) {
  const p = state.playbooks.find((x) => x.id === id);
  if (!p) return;
  const text = `${p.title}\n\n${p.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  try { await navigator.clipboard.writeText(text); toast('Steps copied.'); } catch { toast('Copy blocked by browser.'); }
}

/* ===================================================================== */
/*  VIEW: TEAM                                                             */
/* ===================================================================== */
function renderTeam() {
  const teams = state.teams || [{ id: 'outreach', name: 'Team', tagline: '', focus: '' }];
  if (!teams.some((t) => t.id === activeTeam)) activeTeam = teams[0].id;
  const team = teams.find((t) => t.id === activeTeam);
  const roster = state.agents.filter((a) => (a.team || 'outreach') === activeTeam);
  const live = roster.filter((a) => a.status === 'live').length;
  const blocked = roster.filter((a) => a.status === 'blocked').length;

  const tabs = teams.map((t) => {
    const n = state.agents.filter((a) => (a.team || 'outreach') === t.id).length;
    return `<button class="team-tab ${t.id === activeTeam ? 'on' : ''}" data-act="team-tab" data-id="${t.id}">
      ${esc(t.name)}<span class="team-tab-count">${n}</span></button>`;
  }).join('');

  dom.views.team.innerHTML = `
    <div class="team-tabs">${tabs}</div>
    <div class="team-header">
      <div>
        <span class="eyebrow">${esc(team.focus || '')}</span>
        <h2>${esc(team.name)}</h2>
        <p>${esc(team.tagline || '')}</p>
      </div>
      <div class="team-header-stats">
        <div class="mini-stat"><b>${roster.length}</b><span>agents</span></div>
        <div class="mini-stat"><b class="tone-good">${live}</b><span>live</span></div>
        <div class="mini-stat"><b class="${blocked ? 'tone-bad' : ''}">${blocked}</b><span>blocked</span></div>
      </div>
    </div>
    <div class="agent-grid">${roster.map(agentCard).join('') || '<div class="kcol-empty">No agents on this team yet.</div>'}</div>`;
}
function agentCard(ag) {
  return `
    <article class="agent">
      <div class="agent-top">
        <button class="agent-id" data-act="open-agent" data-id="${ag.id}">
          <span class="avatar lg ${ag.status}">${initials(ag.codename)}</span>
          <span class="agent-name-wrap"><span class="agent-lane eyebrow">${esc(ag.lane)}</span><span class="agent-name">${esc(ag.codename)}</span><span class="agent-role">${esc(ag.role)}</span></span>
        </button>
        <span class="badge ${ag.status}">${statusLabel(ag.status)}</span>
      </div>
      <p class="agent-mission">${esc(ag.mission)}</p>
      <div class="agent-next"><span class="eyebrow">Next</span> ${esc(ag.next)}</div>
      ${ag.blocker ? `<div class="agent-blocker">⛔ ${esc(ag.blocker)}</div>` : ''}
      <div class="agent-stats"><span>⌁ ${Math.round(ag.confidence * 100)}%</span><span>↻ ${relTime(ag.lastRun)}</span><span>▰ ${ag.progress}%</span></div>
      <div class="progress"><span style="width:${ag.progress}%"></span></div>
      <div class="agent-actions">
        <button class="btn btn-ghost btn-small" data-act="agent" data-op="poke" data-id="${ag.id}">Poke</button>
        <button class="btn btn-ghost btn-small" data-act="agent" data-op="run" data-id="${ag.id}">Run</button>
        <button class="btn btn-ghost btn-small" data-act="agent" data-op="pause" data-id="${ag.id}">Pause</button>
        <button class="btn btn-primary btn-small" data-act="open-agent" data-id="${ag.id}">Open</button>
      </div>
    </article>`;
}

/* ===================================================================== */
/*  VIEW: SOULS                                                            */
/* ===================================================================== */
function renderSouls() {
  const souls = window.LUINUS_SOULS;
  dom.views.souls.innerHTML = `<div class="soul-grid">${state.agents.map((ag) => {
    const s = souls[ag.id]; if (!s) return '';
    return `
    <article class="soul">
      <div class="soul-head"><span class="avatar lg ${ag.status}">${initials(s.codename)}</span>
        <div><div class="soul-name">${esc(s.codename)} <span class="soul-role">· ${esc(ag.role)}</span></div><div class="soul-tagline">${esc(s.tagline)}</div></div></div>
      <div class="soul-directive"><span class="eyebrow">Prime directive</span><p>${esc(s.directive)}</p></div>
      <div class="soul-sec"><span class="eyebrow">Operating principles</span><ul>${s.principles.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
      <div class="soul-sec"><span class="eyebrow">Tools</span><div class="tool-tags">${s.tools.map((t) => `<span class="tool-tag">${esc(t)}</span>`).join('')}</div></div>
      <div class="soul-rights"><div><span class="eyebrow good">Decides</span><ul>${s.decide.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div><span class="eyebrow warn">Escalates</span><ul>${s.escalate.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
      <div class="soul-voice">“${esc(s.voice)}”</div>
      <a class="soul-link" href="${s.file}" target="_blank" rel="noopener">Read full soul.md →</a>
    </article>`;
  }).join('')}</div>`;
}

/* ===================================================================== */
/*  DRAWER                                                                 */
/* ===================================================================== */
function openAgentDrawer(id) {
  const ag = agent(id); if (!ag) return;
  const s = window.LUINUS_SOULS[id];
  const cs = state.campaigns.filter((c) => c.owner === id);
  dom.drawerInner.innerHTML = `
    <div class="drawer-head"><div class="drawer-id"><span class="avatar xl ${ag.status}">${initials(ag.codename)}</span>
      <div><div class="eyebrow">${esc(ag.lane)}</div><h2>${esc(ag.codename)}</h2><div class="agent-role">${esc(ag.name)}</div></div></div>
      <button class="drawer-close" data-act="close-drawer">✕</button></div>
    <div class="drawer-tags"><span class="badge ${ag.status}">${statusLabel(ag.status)}</span><span class="kv">Confidence ${Math.round(ag.confidence * 100)}%</span><span class="kv">Last run ${relTime(ag.lastRun)}</span></div>
    <div class="progress big"><span style="width:${ag.progress}%"></span></div>
    <div class="drawer-sec"><span class="eyebrow">Mission</span><p>${esc(ag.mission)}</p></div>
    <div class="drawer-sec"><span class="eyebrow">Next action</span><p>${esc(ag.next)}</p></div>
    ${ag.blocker ? `<div class="agent-blocker">⛔ ${esc(ag.blocker)}</div>` : ''}
    <div class="drawer-io"><div><span class="eyebrow">Inputs</span><p>${esc(ag.io.inputs)}</p></div>
      <div><span class="eyebrow">Outputs</span><p>${esc(ag.io.outputs)}</p></div>
      <div><span class="eyebrow ${ag.io.errors.toLowerCase().includes('none') ? '' : 'warn'}">Status</span><p>${esc(ag.io.errors)}</p></div></div>
    <div class="drawer-sec"><span class="eyebrow">Tools</span><div class="tool-tags">${ag.tools.map((t) => `<span class="tool-tag">${esc(t)}</span>`).join('')}</div></div>
    ${cs.length ? `<div class="drawer-sec"><span class="eyebrow">Campaigns (${cs.length})</span><div class="mini-list">${cs.map((c) => `<button class="mini-row" data-act="open-campaign" data-id="${c.id}"><span class="ch-badge sm ${c.channel}">${channelIcon(c.channel)}</span> ${esc(c.name)} <span class="status-chip st-${c.status}">${c.status}</span></button>`).join('')}</div></div>` : ''}
    <div class="drawer-actions">
      <button class="btn btn-ghost btn-small" data-act="agent" data-op="poke" data-id="${ag.id}">Poke</button>
      <button class="btn btn-ghost btn-small" data-act="agent" data-op="run" data-id="${ag.id}">Run</button>
      <button class="btn btn-ghost btn-small" data-act="agent" data-op="pause" data-id="${ag.id}">Pause</button>
      ${s ? `<a class="btn btn-primary btn-small" href="${s.file}" target="_blank" rel="noopener">soul.md →</a>` : ''}
    </div>`;
  openDrawer();
}

function openCampaignDrawer(id) {
  const c = camp(id); if (!c) return;
  const ag = agent(c.owner);
  const leads = state.leads.filter((l) => l.campaignId === id);
  const pct = c.goalPerDay ? Math.min(100, Math.round(c.sentToday / c.goalPerDay * 100)) : 0;
  dom.drawerInner.innerHTML = `
    <div class="drawer-head"><div class="drawer-id"><span class="ch-badge lg ${c.channel}">${channelIcon(c.channel)}</span>
      <div><div class="eyebrow">${c.channel} · ${esc(c.icp)}</div><h2>${esc(c.name)}</h2></div></div>
      <button class="drawer-close" data-act="close-drawer">✕</button></div>
    <div class="drawer-tags"><span class="status-chip st-${c.status}">${c.status}</span><span class="kv">Owner ${ag ? esc(ag.codename) : c.owner}</span><span class="kv">${c.goalPerDay}/day goal</span></div>
    <div class="goal-row"><span>${c.sentToday}/${c.goalPerDay} today</span><span>${pct}%</span></div>
    <div class="goal-bar big"><span style="width:${pct}%"></span></div>
    <div class="campaign-stats wide"><div><b>${c.totalSent}</b><span>total sent</span></div><div><b>${c.replies}</b><span>replies</span></div><div><b>${c.booked}</b><span>booked</span></div><div><b>${c.totalSent ? (c.replies / c.totalSent * 100).toFixed(1) : '0.0'}%</b><span>reply rate</span></div></div>
    ${c.infra ? `<div class="infra-note">📮 ${c.infra.domains} domains · ${c.infra.inboxes} inboxes · ~${Math.round(c.goalPerDay / Math.max(1, c.infra.inboxes))}/inbox/day${c.infra.warmDaysLeft ? ` · 🔥 warming ${c.infra.warmDaysLeft}d` : ''}</div>` : ''}
    <div class="drawer-sec"><span class="eyebrow">Sequence</span><div class="seq">${c.steps.map((s) => `<div class="seq-step"><span class="seq-day">${s.type === 'engage' || s.day === 0 ? 'Day 0' : 'Day ' + s.day}</span><span class="seq-type t-${s.type}">${s.type}</span><span>${esc(s.label)}</span></div>`).join('')}</div></div>
    <div class="drawer-sec"><span class="eyebrow">Leads in this campaign (${leads.length})</span><div class="mini-list">${leads.slice(0, 6).map((l) => `<button class="mini-row" data-act="open-lead" data-id="${l.id}">${esc(l.name)} <span class="stage-chip pst-${l.stage}">${stageLabel(l.stage)}</span></button>`).join('') || '<p class="subtle">None yet.</p>'}</div></div>
    <div class="drawer-actions">
      ${c.status === 'live' ? `<button class="btn btn-ghost btn-small" data-act="campaign" data-op="pause" data-id="${c.id}">Pause</button>` : `<button class="btn btn-primary btn-small" data-act="campaign" data-op="start" data-id="${c.id}">${c.status === 'warming' ? 'Skip warmup & launch' : 'Launch'}</button>`}
      ${ag ? `<button class="btn btn-ghost btn-small" data-act="open-agent" data-id="${ag.id}">Open ${esc(ag.codename)}</button>` : ''}
    </div>`;
  openDrawer();
}

function openLeadDrawer(id) {
  const l = lead(id); if (!l) return;
  const c = camp(l.campaignId);
  dom.drawerInner.innerHTML = `
    <div class="drawer-head"><div class="drawer-id"><span class="avatar lg">${initials(l.name.replace('Dr. ', ''))}</span>
      <div><div class="eyebrow">${esc(l.specialty)} · ${esc(l.geo)}</div><h2>${esc(l.name)}</h2><div class="agent-role">${esc(l.title)} · ${esc(l.org)}</div></div></div>
      <button class="drawer-close" data-act="close-drawer">✕</button></div>
    <div class="drawer-tags"><span class="stage-chip pst-${l.stage}">${stageLabel(l.stage)}</span><span class="ch-badge sm ${l.channel}">${channelIcon(l.channel)}</span>${c ? `<span class="kv">${esc(c.name)}</span>` : ''}</div>
    <div class="drawer-sec"><span class="eyebrow">Note</span><p>${esc(l.note || '—')}</p></div>
    <div class="drawer-sec"><span class="eyebrow">Move stage</span><div class="stage-picker">${PIPELINE.map((s) => `<button class="chip ${l.stage === s.id ? 'on' : ''}" data-act="set-lead-stage" data-id="${l.id}" data-stage="${s.id}">${s.label}</button>`).join('')}</div></div>
    <div class="drawer-actions">
      <button class="btn btn-primary btn-small" data-act="set-lead-stage" data-id="${l.id}" data-stage="booked">Mark booked</button>
      <button class="btn btn-ghost btn-small warn" data-act="set-lead-stage" data-id="${l.id}" data-stage="passed">Pass</button>
    </div>`;
  openDrawer();
}

function openDrawer() { dom.drawer.classList.add('open'); dom.drawerBackdrop.classList.add('show'); dom.drawer.setAttribute('aria-hidden', 'false'); }
function closeDrawer() { dom.drawer.classList.remove('open'); dom.drawerBackdrop.classList.remove('show'); dom.drawer.setAttribute('aria-hidden', 'true'); }

/* ===================================================================== */
/*  ACTIONS                                                                */
/* ===================================================================== */
function bindGlobal() {
  dom.nav.addEventListener('click', (e) => { const it = e.target.closest('.nav-item'); if (it) setView(it.dataset.view); });
  dom.refreshBtn.addEventListener('click', refreshCycle);
  dom.exportBtn.addEventListener('click', exportSnapshot);
  dom.autopilotToggle.addEventListener('click', toggleAutopilot);
  dom.drawerBackdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.act) {
      case 'goto': setView(el.dataset.view); break;
      case 'team-tab': activeTeam = id; renderTeam(); break;
      case 'rec-go': nextAction().go(); break;
      case 'composer-send': submitComposer(); break;
      case 'chip': composerText = el.dataset.text; renderCommand(); $('composerInput').focus(); break;
      case 'open-agent': openAgentDrawer(id); break;
      case 'open-campaign': openCampaignDrawer(id); break;
      case 'open-lead': openLeadDrawer(id); break;
      case 'close-drawer': closeDrawer(); break;
      case 'agent': agentAction(id, el.dataset.op); break;
      case 'campaign': campaignAction(id, el.dataset.op); break;
      case 'inbox': inboxAction(id, el.dataset.op); break;
      case 'set-lead-stage': moveLead(id, el.dataset.stage); if (dom.drawer.classList.contains('open')) openLeadDrawer(id); break;
      case 'deploy-playbook': deployPlaybook(id); break;
      case 'copy-playbook': copyPlaybook(id); break;
    }
  });
}

function agentAction(id, op) {
  const ag = agent(id); if (!ag) return;
  ag.lastRun = now();
  if (op === 'poke') { if (ag.status !== 'blocked') ag.status = 'live'; ag.progress = clamp(ag.progress + 5); pushActivity(actorOf(id), `${ag.codename} poked.`, lane(ag)); }
  if (op === 'run') { if (ag.status !== 'blocked') ag.status = 'live'; ag.progress = clamp(ag.progress + 12); ag.confidence = clamp01(ag.confidence + 0.03); pushActivity(actorOf(id), `${ag.codename} is running its lane.`, lane(ag)); }
  if (op === 'pause') { ag.status = 'idle'; pushActivity(actorOf(id), `${ag.codename} paused.`, lane(ag)); }
  commit();
  if (dom.drawer.classList.contains('open')) openAgentDrawer(id);
}

function campaignAction(id, op) {
  const c = camp(id); if (!c) return;
  if (op === 'start') {
    c.status = 'live';
    if (c.infra) c.infra.warmDaysLeft = 0;
    const ag = agent(c.owner); if (ag && ag.status !== 'blocked') ag.status = 'live';
    pushActivity(actorOf(c.owner), `Launched campaign: ${c.name}.`, c.channel === 'email' ? 'email' : 'linkedin');
    toast(`${c.name} is live.`);
  } else if (op === 'pause') {
    c.status = 'paused';
    pushActivity(actorOf(c.owner), `Paused campaign: ${c.name}.`, c.channel === 'email' ? 'email' : 'linkedin');
    toast(`${c.name} paused.`);
  }
  commit();
  if (dom.drawer.classList.contains('open')) openCampaignDrawer(id);
}

function refreshCycle() {
  state.agents.forEach((ag) => { if (ag.status === 'idle' && Math.random() > 0.5) { ag.status = 'live'; ag.lastRun = now(); } });
  pushActivity(actorOf('scout'), 'Refresh: team re-synced lists, sends, and replies.', 'leads');
  commit(); toast('Refreshed.');
}

/* ----------------------------------------------------------- autopilot */
function toggleAutopilot() { state.meta.autopilot = !state.meta.autopilot; if (state.meta.autopilot) startAutopilot(); else stopAutopilot(); syncAutopilotUI(); save(); }
function startAutopilot(silent) {
  state.meta.autopilot = true;
  if (autopilotTimer) clearInterval(autopilotTimer);
  autopilotTimer = setInterval(autopilotTick, 5000);
  if (!silent) { pushActivity(actorOf('scout'), 'Autopilot engaged — team is sending 24/7.', 'leads'); commit(); toast('24/7 Autopilot ON.'); }
}
function stopAutopilot() { state.meta.autopilot = false; if (autopilotTimer) clearInterval(autopilotTimer); autopilotTimer = null; pushActivity(actorOf('scout'), 'Autopilot paused.', 'leads'); commit(); toast('Autopilot paused.'); }
function syncAutopilotUI() {
  dom.autopilotToggle.classList.toggle('on', state.meta.autopilot);
  dom.autopilotToggle.setAttribute('aria-checked', String(state.meta.autopilot));
  dom.autopilotSub.textContent = state.meta.autopilot ? 'Running · team active' : 'Paused';
}
function autopilotTick() {
  state.campaigns.forEach((c) => {
    if (c.status === 'warming' && c.infra) {
      if (Math.random() > 0.6) c.infra.warmDaysLeft = Math.max(0, c.infra.warmDaysLeft - 1);
      if (c.infra.warmDaysLeft === 0) { c.status = 'live'; pushActivity(actorOf(c.owner), `${c.name} finished warming — now sending.`, c.channel === 'email' ? 'email' : 'linkedin'); }
      return;
    }
    if (c.status !== 'live') return;
    const batch = c.channel === 'email' ? Math.round(8 + Math.random() * 22) : Math.round(2 + Math.random() * 5);
    const room = Math.max(0, (c.goalPerDay || 0) - c.sentToday);
    const sent = Math.min(batch, room || batch);
    c.sentToday += sent; c.totalSent += sent;
    if (Math.random() > 0.55) { const r = 1 + Math.round(Math.random() * 2); c.replies += r;
      if (Math.random() > 0.6) state.leads.push(replyLead(c)); }
    if (Math.random() > 0.85) { c.booked += 1; const src = state.leads.find((l) => l.campaignId === c.id && l.stage === 'replied'); if (src) src.stage = 'booked'; pushActivity(actorOf('closer'), `Autopilot booked a demo from ${c.name}.`, 'pipeline'); }
  });
  // gentle agent progress
  const a = state.agents[Math.floor(Math.random() * state.agents.length)];
  if (a && a.status !== 'blocked') { a.status = 'live'; a.progress = clamp(a.progress + Math.round(Math.random() * 5)); a.lastRun = now(); }
  if (Math.random() > 0.5) { const lc = state.campaigns.find((c) => c.status === 'live'); if (lc) pushActivity(actorOf(lc.owner), `${lc.name}: +${lc.channel === 'email' ? 'emails' : 'DMs'} sent.`, lc.channel === 'email' ? 'email' : 'linkedin'); }
  commit();
}

/* ------------------------------------------------------------- export */
async function exportSnapshot() {
  const snap = { exportedAt: new Date().toISOString(), metrics: metrics(),
    campaigns: state.campaigns.map((c) => ({ name: c.name, channel: c.channel, status: c.status, sentToday: c.sentToday, totalSent: c.totalSent, replies: c.replies, booked: c.booked })),
    pipeline: PIPELINE.map((s) => ({ stage: s.label, count: state.leads.filter((l) => l.stage === s.id).length })),
    inbox: state.inbox, activity: state.activity };
  const text = JSON.stringify(snap, null, 2);
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `luinus-outreach-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    if (navigator.clipboard) await navigator.clipboard.writeText(text).catch(() => {});
    toast('Snapshot exported + copied.');
  } catch { toast('Snapshot ready (download blocked).'); }
  pushActivity(actorOf('scout'), 'Exported an outreach snapshot.', 'leads');
  commit();
}

/* ---------------------------------------------------------------- utils */
function agent(id) { return state.agents.find((a) => a.id === id); }
function camp(id) { return state.campaigns.find((c) => c.id === id); }
function lead(id) { return state.leads.find((l) => l.id === id); }
function unblockAgent(id) { const ag = agent(id); if (ag && ag.status === 'blocked') { ag.status = 'live'; ag.blocker = null; } }
function lane(ag) { return (ag.lane || '').toLowerCase(); }
const CODES = { scout: 'Scout (Leads)', scribe: 'Scribe (Copy)', mailer: 'Mailer (Email)', connector: 'Connector (LinkedIn)', closer: 'Closer (Pipeline)', pulse: 'Pulse (Marketing)', anchor: 'Anchor (Infra)' };
function actorOf(id) { return CODES[id] || 'System'; }

function freshLead(c) {
  const names = ['Dr. Morales', 'Dr. Bennett', 'Dr. Shah', 'Dr. Larsen', 'Dr. Okafor', 'Dr. Reyes'];
  const geos = ['TX', 'CA', 'NY', 'FL', 'IL', 'WA'];
  return { id: 'l' + Date.now() + Math.floor(Math.random() * 99), name: pick(names), title: 'ER Attending', org: 'New Lead Health', specialty: 'Emergency', geo: pick(geos), channel: c ? c.channel : 'email', campaignId: c ? c.id : null, stage: 'sourced', note: 'Approved + verified.' };
}
function replyLead(c) {
  const names = ['Dr. Foster', 'Dr. Hughes', 'Dr. Pena', 'Dr. Wallace', 'Dr. Idris'];
  const geos = ['TX', 'CA', 'NY', 'FL', 'OH'];
  return { id: 'l' + Date.now() + Math.floor(Math.random() * 99), name: pick(names), title: 'Medical Director', org: 'Replied Health', specialty: 'Emergency', geo: pick(geos), channel: c.channel, campaignId: c.id, stage: 'replied', note: 'Replied from outreach — qualify.' };
}

function pushActivity(actorName, message, type) {
  state.activity.unshift({ id: 'a' + Date.now() + Math.random().toString(16).slice(2, 6), time: now(), actor: actorName, type: type || 'leads', message });
  state.activity = state.activity.slice(0, 40);
}
function activityHTML(list) {
  return list.map((a) => `<div class="activity-item"><span class="act-dot type-${esc(a.type || 'leads')}"></span>
    <div class="act-body"><div class="act-msg">${esc(a.message)}</div><div class="act-meta"><span>${esc(a.actor)}</span><time>${relTime(a.time)}</time></div></div></div>`).join('');
}

function goalTile(label, value, goal, tone) {
  const pct = goal ? Math.min(100, Math.round(value / goal * 100)) : 0;
  return `<div class="tile ${tone}"><div class="tile-label">${esc(label)}</div><div class="tile-value">${fmt(value)}<span class="tile-goal">/ ${fmt(goal)}</span></div><div class="goal-bar"><span style="width:${pct}%"></span></div></div>`;
}
function statTile(label, value, hint, tone) {
  return `<div class="tile ${tone}"><div class="tile-label">${esc(label)}</div><div class="tile-value">${fmt(value)}</div><div class="tile-hint">${esc(hint)}</div></div>`;
}
function chip(text) { return `<button class="qchip" data-act="chip" data-text="${esc(text)}">${esc(text)}</button>`; }

function startClock() { const u = () => dom.clockPill.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); u(); if (clockTimer) clearInterval(clockTimer); clockTimer = setInterval(u, 1000); }
function toast(m) { dom.toast.textContent = m; dom.toast.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => dom.toast.classList.remove('show'), 2200); }

function channelIcon(ch) { return ch === 'email' ? '✉' : ch === 'linkedin' ? 'in' : ch === 'content' ? '✎' : ch === 'pipeline' ? '◉' : '•'; }
function inboxLabel(t) { return ({ reply: 'Reply', objection: 'Objection', 'approve-copy': 'Approve copy', 'approve-leads': 'Approve leads', book: 'Booking' })[t] || t; }
function statusLabel(s) { return ({ live: 'Live', idle: 'Idle', blocked: 'Blocked', waiting: 'Waiting', done: 'Done' })[s] || s; }
function stageLabel(s) { return (PIPELINE.find((x) => x.id === s) || {}).label || s; }
function sum(arr) { return arr.reduce((a, b) => a + (b || 0), 0); }
function clamp(v) { return Math.min(100, Math.max(0, Math.round(v))); }
function clamp01(v) { return Math.min(1, Math.max(0, v)); }
function fmt(n) { return (n || 0).toLocaleString(); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function initials(name) { return (name || '?').replace(/[^a-zA-Z ]/g, '').trim().slice(0, 2).toUpperCase() || '?'; }
function titleCase(s) { return String(s).replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1)); }
function now() { return new Date().toISOString(); }
function relTime(iso) { const m = (Date.now() - new Date(iso).getTime()) / 60000; if (m < 1) return 'just now'; if (m < 60) return `${Math.round(m)}m ago`; const h = Math.floor(m / 60); return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`; }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
