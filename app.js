const STORAGE_KEY = 'luinus-company-control-center:v1';

const state = loadState() ?? {
  telemetry: 'LIVE · seeded state',
  lastUpdated: new Date().toLocaleString(),
  sortByPriority: false,
  agents: [
    { id: 'coo', name: 'COO / Orchestrator', role: 'Company brain', lane: 'Orchestration', status: 'live', mission: 'Coordinate the company loop and unblock the founder.', next: 'Run morning review and push decisions downstream.', progress: 72 },
    { id: 'marketing', name: 'Marketing Agent', role: 'Top of funnel', lane: 'Revenue', status: 'idle', mission: 'Create trust and distribution.', next: 'Draft founder post batch and refine positioning.', progress: 41 },
    { id: 'sales', name: 'Sales Agent', role: 'Pipeline owner', lane: 'Revenue', status: 'blocked', mission: 'Move conversations toward paid pilots.', next: 'Prepare Dr. Otero follow-up and objection handling.', progress: 53 },
    { id: 'product', name: 'Product Agent', role: 'Roadmap owner', lane: 'Product', status: 'live', mission: 'Ship the wedge that closes revenue.', next: 'Finish MDM section v1 and prepare demo copy.', progress: 88 },
    { id: 'ops', name: 'Ops Agent', role: 'Risk reducer', lane: 'Operations', status: 'idle', mission: 'Keep the company compliant and calm.', next: 'Update provenance checklist and decision log.', progress: 34 },
    { id: 'qa', name: 'QA / Review Agent', role: 'Gatekeeper', lane: 'Quality', status: 'live', mission: 'Stop bad claims and broken UX before they ship.', next: 'Audit public claims and verify the latest demo.', progress: 67 },
    { id: 'research', name: 'Research Agent', role: 'Signal watcher', lane: 'Research', status: 'idle', mission: 'Watch competitors and tools without noise.', next: 'Scan new launches and summarize opportunities.', progress: 28 },
  ],
  queue: [
    { id: 'q1', lane: 'Revenue', title: 'Dr. Otero follow-up', detail: 'Close momentum and book the next conversation.', priority: 'P0', owner: 'Sales', done: false },
    { id: 'q2', lane: 'Product', title: 'Ship MDM section v1', detail: 'Core wedge for emergency medicine.', priority: 'P0', owner: 'Product', done: false },
    { id: 'q3', lane: 'Marketing', title: 'Founder LinkedIn post batch', detail: 'Trust and top-of-funnel.', priority: 'P1', owner: 'Marketing', done: false },
    { id: 'q4', lane: 'Ops', title: 'Compliance / provenance checklist', detail: 'Reduce risk before scale.', priority: 'P1', owner: 'Ops', done: false },
    { id: 'q5', lane: 'QA', title: 'Public claims sanity check', detail: 'Avoid overpromising.', priority: 'P1', owner: 'QA', done: false },
    { id: 'q6', lane: 'Research', title: 'Competitive scan and tool watch', detail: 'Better decisions.', priority: 'P2', owner: 'Research', done: false },
  ],
  decisions: [
    { id: 'd1', title: 'Pricing for pilot?', detail: 'Do not guess. Decide the pilot structure before a prospect asks.', resolved: false },
    { id: 'd2', title: 'What ships in MDM v1?', detail: 'Keep scope ruthlessly small so engineering can finish.', resolved: false },
    { id: 'd3', title: 'Which proof point goes public?', detail: 'Any claim touching performance needs a founder sign-off.', resolved: false },
  ],
  activity: [
    { id: 'a1', time: timeLabel(-6), text: 'COO prioritized the revenue lane and unblocked sales follow-up.' },
    { id: 'a2', time: timeLabel(-18), text: 'Product moved MDM to near-shippable status.' },
    { id: 'a3', time: timeLabel(-32), text: 'QA flagged a public claims issue for review.' },
    { id: 'a4', time: timeLabel(-52), text: 'Ops updated the compliance checklist.' },
  ],
};

const el = {
  telemetryPill: document.getElementById('telemetryPill'),
  heroMetrics: document.getElementById('heroMetrics'),
  agentsGrid: document.getElementById('agentsGrid'),
  queueList: document.getElementById('queueList'),
  decisionList: document.getElementById('decisionList'),
  activityList: document.getElementById('activityList'),
  lastUpdated: document.getElementById('lastUpdated'),
  refreshBtn: document.getElementById('refreshBtn'),
  advanceBtn: document.getElementById('advanceBtn'),
  focusProductBtn: document.getElementById('focusProductBtn'),
  sortQueueBtn: document.getElementById('sortQueueBtn'),
  clearDecisionsBtn: document.getElementById('clearDecisionsBtn'),
  exportBtn: document.getElementById('exportBtn'),
};

bindActions();
render();

function bindActions() {
  el.refreshBtn.addEventListener('click', () => {
    randomizeCycle();
    pushActivity('Manual refresh: COO synced the whole company loop.');
    saveAndRender();
  });

  el.advanceBtn.addEventListener('click', () => {
    advanceCompanyCycle();
    saveAndRender();
  });

  el.focusProductBtn.addEventListener('click', () => {
    state.queue = state.queue.map((item) => item.lane === 'Product' ? { ...item, priority: 'P0' } : item);
    pushActivity('Founder focus shifted the queue toward the product wedge.');
    saveAndRender();
  });

  el.sortQueueBtn.addEventListener('click', () => {
    state.sortByPriority = !state.sortByPriority;
    pushActivity(state.sortByPriority ? 'Queue sorted by priority.' : 'Queue returned to operating order.');
    saveAndRender();
  });

  el.clearDecisionsBtn.addEventListener('click', () => {
    state.decisions = state.decisions.filter((d) => !d.resolved);
    pushActivity('Cleared resolved decisions from the founder panel.');
    saveAndRender();
  });

  el.exportBtn.addEventListener('click', async () => {
    const snapshot = JSON.stringify(state, null, 2);
    try {
      await navigator.clipboard.writeText(snapshot);
      pushActivity('Snapshot copied to clipboard.');
    } catch {
      pushActivity('Snapshot ready in the browser, clipboard permission blocked.');
    }
    saveAndRender();
  });
}

function saveAndRender() {
  state.lastUpdated = new Date().toLocaleString();
  persistState();
  render();
}

function render() {
  el.telemetryPill.textContent = state.telemetry;
  el.lastUpdated.textContent = `Last refresh: ${state.lastUpdated}`;
  renderHeroMetrics();
  renderAgents();
  renderQueue();
  renderDecisions();
  renderActivity();
}

function renderHeroMetrics() {
  const online = state.agents.filter((a) => a.status === 'live').length;
  const blocked = state.agents.filter((a) => a.status === 'blocked').length;
  const openDecisions = state.decisions.length;
  const openWork = state.queue.filter((q) => !q.done).length;

  el.heroMetrics.innerHTML = [
    metric('Agents online', `${online}/${state.agents.length}`, 'Live lanes are active and watching the queue.'),
    metric('Blocked lanes', String(blocked), 'Anything blocked needs the founder or COO.'),
    metric('Open decisions', String(openDecisions), 'These should get answered before the next call.'),
    metric('Open work items', String(openWork), 'Queue items still waiting on execution.'),
  ].join('');
}

function renderAgents() {
  el.agentsGrid.innerHTML = state.agents.map((agent) => `
    <article class="agent">
      <div class="agent-top">
        <div>
          <div class="eyebrow">${agent.lane}</div>
          <h4>${agent.name}</h4>
          <div class="role">${agent.role}</div>
        </div>
        <span class="badge ${agent.status}">${agent.status}</span>
      </div>
      <p>${agent.mission}</p>
      <p><strong>Next:</strong> ${agent.next}</p>
      <div class="progress" aria-label="${agent.name} progress"><span style="width:${agent.progress}%"></span></div>
      <div class="agent-actions">
        <button class="btn btn-ghost btn-small" data-agent-action="poke" data-agent-id="${agent.id}">Poke</button>
        <button class="btn btn-ghost btn-small" data-agent-action="work" data-agent-id="${agent.id}">Work</button>
        <button class="btn btn-primary btn-small" data-agent-action="finish" data-agent-id="${agent.id}">Finish step</button>
      </div>
    </article>
  `).join('');

  el.agentsGrid.querySelectorAll('button[data-agent-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const agentId = button.getAttribute('data-agent-id');
      const action = button.getAttribute('data-agent-action');
      if (!agentId || !action) return;
      const agent = state.agents.find((a) => a.id === agentId);
      if (!agent) return;

      if (action === 'poke') {
        agent.status = 'live';
        agent.progress = clamp(agent.progress + 6, 0, 100);
        pushActivity(`${agent.name} was poked and is now live.`);
      }
      if (action === 'work') {
        agent.status = 'live';
        agent.progress = clamp(agent.progress + 11, 0, 100);
        agent.next = bumpNext(agent.next);
        pushActivity(`${agent.name} is actively working the lane.`);
      }
      if (action === 'finish') {
        agent.status = 'done';
        agent.progress = 100;
        pushActivity(`${agent.name} completed a step.`);
        completeQueueItem(agent.lane);
      }
      saveAndRender();
    });
  });
}

function renderQueue() {
  const queue = state.sortByPriority ? [...state.queue].sort((a, b) => priorityScore(a.priority) - priorityScore(b.priority)) : state.queue;
  el.queueList.innerHTML = queue.map((item) => `
    <article class="queue-item">
      <div class="queue-head">
        <strong>${item.title}</strong>
        <span class="tag ${item.priority.toLowerCase()}">${item.priority}</span>
      </div>
      <div class="meta"><span>${item.lane}</span><span>•</span><span>${item.owner}</span></div>
      <p>${item.detail}</p>
      <div class="queue-actions">
        <button class="btn btn-primary btn-small" data-queue-action="done" data-queue-id="${item.id}" ${item.done ? 'disabled' : ''}>Mark done</button>
        <button class="btn btn-ghost btn-small" data-queue-action="defer" data-queue-id="${item.id}" ${item.done ? 'disabled' : ''}>Defer</button>
      </div>
    </article>
  `).join('');

  el.queueList.querySelectorAll('button[data-queue-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-queue-id');
      const action = button.getAttribute('data-queue-action');
      const item = state.queue.find((q) => q.id === id);
      if (!item) return;

      if (action === 'done') {
        item.done = true;
        pushActivity(`Queue item completed: ${item.title}.`);
      } else {
        item.priority = item.priority === 'P0' ? 'P1' : 'P2';
        pushActivity(`Queue item deferred: ${item.title}.`);
      }
      saveAndRender();
    });
  });
}

function renderDecisions() {
  const decisions = state.decisions;
  el.decisionList.innerHTML = decisions.map((item) => `
    <article class="decision-item">
      <div class="decision-head">
        <strong>${item.title}</strong>
        <span class="tag">Founder call</span>
      </div>
      <p>${item.detail}</p>
      <div class="decision-actions">
        <button class="btn btn-primary btn-small" data-decision-action="resolve" data-decision-id="${item.id}">Resolve</button>
        <button class="btn btn-ghost btn-small" data-decision-action="keep" data-decision-id="${item.id}">Keep open</button>
      </div>
    </article>
  `).join('');

  el.decisionList.querySelectorAll('button[data-decision-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-decision-id');
      const action = button.getAttribute('data-decision-action');
      const item = state.decisions.find((d) => d.id === id);
      if (!item) return;
      if (action === 'resolve') {
        item.resolved = true;
        pushActivity(`Founder decision resolved: ${item.title}.`);
        state.decisions = state.decisions.filter((d) => !d.resolved);
      } else {
        pushActivity(`Founder kept decision open: ${item.title}.`);
      }
      saveAndRender();
    });
  });
}

function renderActivity() {
  el.activityList.innerHTML = state.activity.map((item) => `
    <article class="activity-item">
      <div class="activity-head">
        <strong>${item.text}</strong>
        <time>${item.time}</time>
      </div>
    </article>
  `).join('');
}

function pushActivity(text) {
  state.activity.unshift({ id: crypto.randomUUID(), time: timeLabel(0), text });
  state.activity = state.activity.slice(0, 6);
}

function advanceCompanyCycle() {
  const liveAgent = state.agents.find((a) => a.status !== 'done');
  if (liveAgent) {
    liveAgent.status = 'live';
    liveAgent.progress = clamp(liveAgent.progress + 9, 0, 100);
    pushActivity(`Cycle advanced: ${liveAgent.name} moved forward.`);
  }

  const openItem = state.queue.find((q) => !q.done);
  if (openItem) {
    openItem.priority = openItem.priority === 'P2' ? 'P1' : 'P0';
    pushActivity(`Queue nudged toward the highest-value item: ${openItem.title}.`);
  }

  const openDecision = state.decisions[0];
  if (openDecision) {
    pushActivity(`Founder is still asked to decide: ${openDecision.title}.`);
  }

  randomizeCycle();
  saveAndRender();
}

function randomizeCycle() {
  const statuses = ['live', 'idle', 'blocked'];
  state.agents = state.agents.map((agent, index) => ({
    ...agent,
    status: index === 0 ? 'live' : statuses[(Math.floor(Math.random() * statuses.length))],
    progress: clamp(agent.progress + Math.floor(Math.random() * 7) - 2, 0, 100),
  }));
  state.telemetry = `LIVE · seeded state · refreshed ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  pushActivity('Telemetry refreshed across company lanes.');
}

function completeQueueItem(lane) {
  const item = state.queue.find((q) => q.lane === lane && !q.done);
  if (!item) return;
  item.done = true;
  pushActivity(`Lane complete: ${item.title}.`);
}

function bumpNext(text) {
  if (text.includes('review')) return text.replace('review', 'reviewed');
  if (text.includes('prepare')) return text.replace('prepare', 'prepared');
  return `${text} — done`;
}

function priorityScore(priority) {
  return priority === 'P0' ? 0 : priority === 'P1' ? 1 : 2;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function metric(label, value, hint) {
  return `
    <div class="metric">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="hint">${hint}</div>
    </div>
  `;
}

function timeLabel(minutesAgo) {
  const d = new Date(Date.now() + minutesAgo * 60 * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
