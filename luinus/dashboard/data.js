/* Luinus Company Control Center — seed data
 * One source of truth. Tasks power both the Execution Queue and the Kanban board.
 * Everything here is realistic mock state, structured so it can be swapped for
 * real agent telemetry later without touching the UI.
 */

const SEED = {
  meta: {
    company: 'Luinus AI',
    cadence: '30m',
    autopilot: false,
    sortByPriority: false,
    lastRefresh: new Date().toISOString(),
    startedAt: new Date().toISOString(),
  },

  // ----- Agents -------------------------------------------------------------
  agents: [
    {
      id: 'coo', name: 'COO / Orchestrator', codename: 'Atlas', role: 'Company brain',
      lane: 'Orchestration', status: 'live', confidence: 0.93, progress: 72,
      mission: 'Coordinate the company loop and unblock the founder.',
      next: 'Run the morning review and push decisions downstream.',
      lastRun: minsAgo(4), blocker: null, soul: 'souls/coo.md',
      tools: ['Execution Queue', 'Agent roster', 'Decisions panel', 'Activity stream', 'Alerts'],
      io: {
        inputs: 'Full company state, blocker signals, founder decisions.',
        outputs: 'Re-ranked queue, agent pokes, founder decision briefs.',
        errors: 'None this cycle.',
      },
    },
    {
      id: 'sales', name: 'Sales Agent', codename: 'Closer', role: 'Pipeline owner',
      lane: 'Revenue', status: 'blocked', confidence: 0.61, progress: 53,
      mission: 'Move conversations toward paid pilots.',
      next: 'Prepare Dr. Otero follow-up and objection handling.',
      lastRun: minsAgo(22), blocker: 'Needs approved pilot pricing before next call.', soul: 'souls/sales.md',
      tools: ['Pipeline tasks', 'Marketing handoff', 'Product handoff', 'Decisions panel'],
      io: {
        inputs: 'Qualified leads, prospect objections, product capability notes.',
        outputs: 'Booked calls, follow-up drafts, pricing decision requests.',
        errors: 'Blocked: cannot quote pricing the founder has not approved.',
      },
    },
    {
      id: 'marketing', name: 'Marketing Agent', codename: 'Signal', role: 'Top of funnel',
      lane: 'Revenue', status: 'live', confidence: 0.78, progress: 41,
      mission: 'Create trust and distribution.',
      next: 'Draft founder post batch and refine positioning.',
      lastRun: minsAgo(11), blocker: null, soul: 'souls/marketing.md',
      tools: ['Content tasks', 'Positioning doc', 'QA handoff', 'Research handoff'],
      io: {
        inputs: 'Positioning, what converts (from Sales), competitive language.',
        outputs: 'Approvable post drafts, refreshed positioning, claims for QA.',
        errors: 'None. One claim awaiting QA verification.',
      },
    },
    {
      id: 'product', name: 'Product Agent', codename: 'Forge', role: 'Roadmap owner',
      lane: 'Product', status: 'live', confidence: 0.88, progress: 88,
      mission: 'Ship the wedge that closes revenue.',
      next: 'Finish MDM section v1 and prepare demo copy.',
      lastRun: minsAgo(2), blocker: null, soul: 'souls/product.md',
      tools: ['Build tasks', 'Scope doc', 'QA handoff', 'Sales handoff', 'Decisions panel'],
      io: {
        inputs: 'Prospect pain (from Sales), scope decision, QA findings.',
        outputs: 'Demoable MDM slice, capability notes, scope tradeoff for founder.',
        errors: 'None. Export sub-feature pending scope call.',
      },
    },
    {
      id: 'ops', name: 'Ops / Compliance Agent', codename: 'Anchor', role: 'Risk reducer',
      lane: 'Operations', status: 'idle', confidence: 0.82, progress: 34,
      mission: 'Keep the company compliant and calm.',
      next: 'Update provenance checklist and decision log.',
      lastRun: minsAgo(38), blocker: null, soul: 'souls/ops.md',
      tools: ['Decision log', 'Provenance checklist', 'Risk flags', 'Handoff review'],
      io: {
        inputs: 'Outgoing claims, data flows, founder decisions to log.',
        outputs: 'Updated decision log, provenance checks, risk flags.',
        errors: 'Two public claims currently untraced — flagged.',
      },
    },
    {
      id: 'qa', name: 'QA / Review Agent', codename: 'Sentinel', role: 'Gatekeeper',
      lane: 'Quality', status: 'live', confidence: 0.74, progress: 67,
      mission: 'Stop bad claims and broken UX before they ship.',
      next: 'Audit public claims and verify the latest demo.',
      lastRun: minsAgo(7), blocker: null, soul: 'souls/qa.md',
      tools: ['Review queue', 'Claims audit', 'Demo verification', 'Alerts'],
      io: {
        inputs: 'Builds from Product, claims from Marketing.',
        outputs: 'PASS / BLOCK verdicts with reasons, verified demos.',
        errors: 'One claim ("clinically validated") blocked — no source.',
      },
    },
    {
      id: 'research', name: 'Research Agent', codename: 'Scout', role: 'Signal watcher',
      lane: 'Research', status: 'idle', confidence: 0.7, progress: 28,
      mission: 'Watch competitors and tools without noise.',
      next: 'Scan new launches and summarize opportunities.',
      lastRun: minsAgo(54), blocker: null, soul: 'souls/research.md',
      tools: ['Web search / fetch', 'Competitive scan', 'Research briefs', 'Decisions panel'],
      io: {
        inputs: 'Watchlist of competitors, tools, and market trends.',
        outputs: 'Sourced briefs ending in a recommendation.',
        errors: 'None. One brief pending on a new entrant.',
      },
    },
    {
      id: 'support', name: 'Customer Success Agent', codename: 'Harbor', role: 'Retention owner',
      lane: 'Customer', status: 'waiting', confidence: 0.8, progress: 46,
      mission: 'Make existing customers successful and vocal.',
      next: 'Draft proactive pilot check-in and file feedback to Product.',
      lastRun: minsAgo(29), blocker: null, soul: 'souls/support.md',
      tools: ['Customer tasks', 'Product handoff', 'Sales handoff', 'Ops handoff'],
      io: {
        inputs: 'Pilot account health, open issues, customer feedback.',
        outputs: 'Proactive check-ins, filed bugs with repro, churn-risk flags.',
        errors: 'Waiting on Product to confirm one fix before replying.',
      },
    },
  ],

  // ----- Tasks (power Queue + Kanban) ---------------------------------------
  // stage: backlog | in_progress | blocked | review | shipped
  tasks: [
    { id: 'q1', title: 'Dr. Otero follow-up', detail: 'Close momentum and book the next conversation.', lane: 'Revenue', owner: 'sales', priority: 'P0', stage: 'blocked', deps: ['Pilot pricing decision'], dueIn: 1, notes: 'Blocked on founder pricing call.' },
    { id: 'q2', title: 'Ship MDM section v1', detail: 'Core wedge for emergency medicine.', lane: 'Product', owner: 'product', priority: 'P0', stage: 'in_progress', deps: [], dueIn: 2, notes: '88% — demoable, export pending scope.' },
    { id: 'q3', title: 'Founder LinkedIn post batch', detail: 'Trust and top-of-funnel.', lane: 'Revenue', owner: 'marketing', priority: 'P1', stage: 'in_progress', deps: ['QA claim check'], dueIn: 3, notes: 'Drafting batch of 5.' },
    { id: 'q4', title: 'Compliance / provenance checklist', detail: 'Reduce risk before scale.', lane: 'Operations', owner: 'ops', priority: 'P1', stage: 'backlog', deps: [], dueIn: 4, notes: 'Two untraced claims to resolve.' },
    { id: 'q5', title: 'Public claims sanity check', detail: 'Avoid overpromising.', lane: 'Quality', owner: 'qa', priority: 'P1', stage: 'review', deps: [], dueIn: 2, notes: '1 of 3 claims blocked — needs source.' },
    { id: 'q6', title: 'Competitive scan + tool watch', detail: 'Sharper decisions.', lane: 'Research', owner: 'research', priority: 'P2', stage: 'backlog', deps: [], dueIn: 5, notes: 'New entrant brief in progress.' },
    { id: 'q7', title: 'Demo script for MDM wedge', detail: 'What Sales shows a prospect.', lane: 'Product', owner: 'product', priority: 'P1', stage: 'review', deps: ['Ship MDM section v1'], dueIn: 3, notes: 'Verifying flow with QA.' },
    { id: 'q8', title: 'Pilot account check-in', detail: 'Keep the existing pilot healthy.', lane: 'Customer', owner: 'support', priority: 'P1', stage: 'in_progress', deps: [], dueIn: 2, notes: 'Proactive touch + feedback to Product.' },
    { id: 'q9', title: 'Positioning v2 (integration story)', detail: 'Lead with the moat Research found.', lane: 'Revenue', owner: 'marketing', priority: 'P2', stage: 'backlog', deps: ['Competitive scan + tool watch'], dueIn: 6, notes: 'Pending research brief.' },
    { id: 'q10', title: 'Decision log reconciliation', detail: 'Company memory stays auditable.', lane: 'Operations', owner: 'ops', priority: 'P2', stage: 'backlog', deps: [], dueIn: 5, notes: 'Routine overnight task.' },
    { id: 'q11', title: 'Objection handling pack', detail: 'Top 3 objections + evidence.', lane: 'Revenue', owner: 'sales', priority: 'P1', stage: 'in_progress', deps: [], dueIn: 2, notes: 'For the Otero call.' },
    { id: 'q12', title: 'New entrant teardown brief', detail: 'So-what: harden integration story.', lane: 'Research', owner: 'research', priority: 'P2', stage: 'review', deps: [], dueIn: 4, notes: 'Sourced, pending recommendation polish.' },
    { id: 'q13', title: 'Onboard checklist for pilots', detail: 'Make pilot success repeatable.', lane: 'Customer', owner: 'support', priority: 'P2', stage: 'shipped', deps: [], dueIn: 0, notes: 'Shipped v1.' },
    { id: 'q14', title: 'Hero claim verification', detail: 'Every public number is sourced.', lane: 'Quality', owner: 'qa', priority: 'P0', stage: 'blocked', deps: ['Provenance from Ops'], dueIn: 1, notes: 'Blocked: source missing.' },
  ],

  // ----- Founder decisions --------------------------------------------------
  decisions: [
    { id: 'd1', title: 'Pricing for the pilot?', detail: 'Decide the pilot structure before a prospect asks. Sales is blocked on this.', owner: 'Founder', urgency: 'high', requestedBy: 'sales', status: 'open' },
    { id: 'd2', title: 'What ships in MDM v1?', detail: 'Cut the export → ship Friday. Keep it → slip a week. Product needs the call.', owner: 'Founder', urgency: 'high', requestedBy: 'product', status: 'open' },
    { id: 'd3', title: 'Which proof point goes public?', detail: 'Any claim touching performance needs founder sign-off. QA has two candidates.', owner: 'Founder', urgency: 'medium', requestedBy: 'qa', status: 'open' },
    { id: 'd4', title: 'Build vs. partner on integrations?', detail: 'Research flags a new entrant; integration is the moat. Strategic fork.', owner: 'Founder', urgency: 'low', requestedBy: 'research', status: 'open' },
  ],

  // ----- Alerts / blockers --------------------------------------------------
  // severity: critical | warn | info
  alerts: [
    { id: 'al1', type: 'Blocked lane', title: 'Sales is blocked on pricing', detail: 'Otero follow-up cannot proceed without approved pilot pricing.', severity: 'critical', relatedId: 'sales' },
    { id: 'al2', type: 'Unverified claim', title: '“Clinically validated” has no source', detail: 'QA blocked the claim. It cannot ship and needs founder review.', severity: 'critical', relatedId: 'qa' },
    { id: 'al3', type: 'Provenance gap', title: 'Two public claims untraced', detail: 'Ops flagged claims without a traceable source ahead of the post batch.', severity: 'warn', relatedId: 'ops' },
    { id: 'al4', type: 'Stale agent', title: 'Research idle for ~54m', detail: 'Watchlist scan is overdue; the entrant brief is waiting.', severity: 'warn', relatedId: 'research' },
    { id: 'al5', type: 'Waiting on handoff', title: 'Support waiting on Product', detail: 'Cannot confirm a fix to the customer until Product replies.', severity: 'info', relatedId: 'support' },
  ],

  // ----- Activity stream ----------------------------------------------------
  activity: [
    { id: 'a1', time: minsAgo(4), actor: 'Atlas (COO)', type: 'orchestration', message: 'Prioritized the revenue lane and surfaced the pricing decision.' },
    { id: 'a2', time: minsAgo(2), actor: 'Forge (Product)', type: 'product', message: 'Moved MDM v1 to near-shippable (88%).' },
    { id: 'a3', time: minsAgo(7), actor: 'Sentinel (QA)', type: 'quality', message: 'Blocked “clinically validated” claim — no source.' },
    { id: 'a4', time: minsAgo(22), actor: 'Closer (Sales)', type: 'revenue', message: 'Drafted Otero follow-up; blocked pending pricing.' },
    { id: 'a5', time: minsAgo(38), actor: 'Anchor (Ops)', type: 'operations', message: 'Flagged two untraced public claims.' },
    { id: 'a6', time: minsAgo(54), actor: 'Scout (Research)', type: 'research', message: 'Spotted a new entrant; teardown brief in progress.' },
  ],
};

function minsAgo(m) {
  return new Date(Date.now() - m * 60000).toISOString();
}

if (typeof window !== 'undefined') window.LUINUS_SEED = SEED;
