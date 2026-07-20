/* Luinus Growth Engine — seed data
 * A focused, automated outreach team for booking doctor demos.
 * Channels: cold email (volume) + LinkedIn DMs. No code, no product ops.
 * Realistic mock state, structured to swap for live data later.
 */

const SEED = {
  meta: {
    company: 'Luinus AI',
    autopilot: false,
    lastRefresh: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    // Daily outreach goals the team works toward 24/7.
    goals: { emailsPerDay: 1000, dmsPerDay: 100, leadsPerDay: 300, callsPerDay: 5 },
  },

  // ----- Teams (switchable departments) -------------------------------------
  teams: [
    { id: 'outreach', name: 'Outreach Team', tagline: 'Books doctor demos via cold email + LinkedIn.', focus: 'Pipeline & revenue' },
    { id: 'marketing', name: 'Marketing Team', tagline: 'Builds trust and warms the audience before outreach lands.', focus: 'Authority & demand' },
    { id: 'operations', name: 'Operations Team', tagline: 'Keeps the engine clean, compliant, and measured.', focus: 'Systems & deliverability' },
  ],

  // ----- The agents, grouped by team ----------------------------------------
  agents: [
    {
      id: 'scout', name: 'Lead Researcher', codename: 'Scout', role: 'Builds the lists',
      lane: 'Leads', team: 'outreach', status: 'live', confidence: 0.86, progress: 64,
      mission: 'Find and verify the right doctors to reach — ICP, specialty, geo.',
      next: 'Source 300 ER physicians and enrich with verified emails + LinkedIn.',
      lastRun: minsAgo(6), blocker: null, soul: 'souls/scout.md',
      tools: ['Apollo / Clay (data)', 'Email verification', 'LinkedIn Sales Navigator', 'ICP filters'],
      io: {
        inputs: 'Target ICP (specialty, title, geo, org size).',
        outputs: 'Verified lead lists (name, title, org, email, LinkedIn).',
        errors: 'None. 250 sourced leads awaiting your approval.',
      },
    },
    {
      id: 'scribe', name: 'Copywriter', codename: 'Scribe', role: 'Writes the messages',
      lane: 'Copy', team: 'outreach', status: 'waiting', confidence: 0.81, progress: 48,
      mission: 'Write short, personalized sequences that get replies — not spam.',
      next: 'Draft the 4-step ER cold-email sequence + 2 subject-line variants.',
      lastRun: minsAgo(14), blocker: null, soul: 'souls/scribe.md',
      tools: ['Sequence builder', 'Personalization tokens', 'A/B variants', 'Spam-word check'],
      io: {
        inputs: 'Offer, ICP pain, proof points, channel.',
        outputs: 'Email + DM sequences with personalization, ready for approval.',
        errors: 'Waiting on your sign-off for the ER sequence copy.',
      },
    },
    {
      id: 'mailer', name: 'Email Outreach', codename: 'Mailer', role: 'Sends cold email at volume',
      lane: 'Email', team: 'outreach', status: 'live', confidence: 0.74, progress: 71,
      mission: 'Run cold email across warmed inboxes — at volume, in the inbox.',
      next: 'Push the Hospitalist sequence and keep deliverability green.',
      lastRun: minsAgo(2), blocker: null, soul: 'souls/mailer.md',
      tools: ['Instantly / Smartlead', 'Inbox rotation', 'Warmup', 'Follow-up automation'],
      io: {
        inputs: 'Approved sequence + verified list + warmed inboxes.',
        outputs: 'Sends, opens, replies routed to the Closer.',
        errors: 'ER campaign still warming (9 days left) — cannot send yet.',
      },
    },
    {
      id: 'connector', name: 'LinkedIn / DM', codename: 'Connector', role: 'Sends DMs',
      lane: 'LinkedIn', team: 'outreach', status: 'live', confidence: 0.7, progress: 55,
      mission: 'Warm up, connect, and DM decision-makers without getting flagged.',
      next: 'Pre-engage 40 Medical Directors, then send 80 connect + DM.',
      lastRun: minsAgo(9), blocker: null, soul: 'souls/connector.md',
      tools: ['HeyReach / Expandi', 'Sales Navigator', 'Pre-engagement', 'Connection + DM steps'],
      io: {
        inputs: 'Approved DM sequence + targeted LinkedIn list.',
        outputs: 'Connections, DMs sent, replies routed to the Closer.',
        errors: 'None. Holding to ~80/day to stay safe.',
      },
    },
    {
      id: 'closer', name: 'Reply & Booking', codename: 'Closer', role: 'Books the calls',
      lane: 'Pipeline', team: 'outreach', status: 'blocked', confidence: 0.66, progress: 42,
      mission: 'Answer fast, handle objections, and get demos on the calendar.',
      next: 'Reply to Dr. Otero and book; handle the HIPAA objection.',
      lastRun: minsAgo(11), blocker: 'Needs your approval on the Otero reply + a HIPAA answer.',
      soul: 'souls/closer.md',
      tools: ['Unified inbox', 'Calendar / scheduler', 'Objection library', 'CRM update'],
      io: {
        inputs: 'Replies from email + LinkedIn.',
        outputs: 'Booked demos, qualified leads, objection responses.',
        errors: 'Blocked: 2 replies need a human decision.',
      },
    },
    {
      id: 'pulse', name: 'Marketing / Content', codename: 'Pulse', role: 'Warms the audience',
      lane: 'Marketing', team: 'marketing', status: 'idle', confidence: 0.78, progress: 33,
      mission: 'Build founder authority so cold outreach lands warmer.',
      next: 'Draft a founder post batch on ER documentation pain.',
      lastRun: minsAgo(41), blocker: null, soul: 'souls/pulse.md',
      tools: ['Content calendar', 'Founder voice', 'Proof / case angles', 'Engagement'],
      io: {
        inputs: 'Wins, proof points, what converts in outreach.',
        outputs: 'Founder posts that build trust and lift reply rates.',
        errors: 'None. Post batch pending review.',
      },
    },
    {
      id: 'echo', name: 'Social & Engagement', codename: 'Echo', role: 'Warms the audience',
      lane: 'Social', team: 'marketing', status: 'live', confidence: 0.72, progress: 38,
      mission: 'Engage target accounts so cold DMs land on a familiar name.',
      next: 'React + comment on 20 target doctors’ posts; reshare a founder win.',
      lastRun: minsAgo(16), blocker: null, soul: 'souls/echo.md',
      tools: ['Engagement automation', 'Founder profile', 'Comment library', 'Social listening'],
      io: {
        inputs: 'Connector’s target list, founder wins, trending clinical topics.',
        outputs: 'Warmed target accounts, higher DM reply rates, community presence.',
        errors: 'None. Engaging today’s Medical Director list.',
      },
    },
    {
      id: 'lens', name: 'Market Research', codename: 'Lens', role: 'Finds what converts',
      lane: 'Research', team: 'marketing', status: 'idle', confidence: 0.75, progress: 26,
      mission: 'Track competitor messaging and the exact words doctors use.',
      next: 'Summarize 3 competitor angles + 5 phrases doctors actually say.',
      lastRun: minsAgo(63), blocker: null, soul: 'souls/lens.md',
      tools: ['Web research', 'Competitor watch', 'Message mining', 'ICP insights'],
      io: {
        inputs: 'Competitors, reviews, forums, what’s replying in outreach.',
        outputs: 'Sourced insights + phrases fed to Scribe and Pulse.',
        errors: 'None. Competitor teardown pending.',
      },
    },
    {
      id: 'anchor', name: 'Deliverability & Compliance', codename: 'Anchor', role: 'Keeps it landing & legal',
      lane: 'Infra', team: 'operations', status: 'live', confidence: 0.83, progress: 60,
      mission: 'Protect deliverability and keep outreach CAN-SPAM / HIPAA-safe.',
      next: 'Watch domain health, bounce rate, and process opt-outs.',
      lastRun: minsAgo(18), blocker: null, soul: 'souls/anchor.md',
      tools: ['Domain health (SPF/DKIM/DMARC)', 'Bounce monitor', 'Opt-out handling', 'Spam-placement tests'],
      io: {
        inputs: 'Sending volume, bounces, spam-placement tests, domains.',
        outputs: 'Green deliverability, suppression list, compliance flags.',
        errors: 'Bounce rate 2.1% (safe, <3%). One domain needs DMARC.',
      },
    },
    {
      id: 'atlas', name: 'Operations Lead', codename: 'Atlas', role: 'Coordinates the teams',
      lane: 'Orchestration', team: 'operations', status: 'live', confidence: 0.9, progress: 68,
      mission: 'Keep every team aligned, unblock the founder, surface the next decision.',
      next: 'Run the cross-team standup and route today’s blockers.',
      lastRun: minsAgo(4), blocker: null, soul: 'souls/atlas.md',
      tools: ['Cross-team queue', 'Daily standup', 'Decision routing', 'Reporting'],
      io: {
        inputs: 'Every team’s status, blockers, and open decisions.',
        outputs: 'Aligned priorities, routed blockers, a clear founder inbox.',
        errors: 'None. 2 items routed to your inbox.',
      },
    },
    {
      id: 'ledger', name: 'RevOps / CRM', codename: 'Ledger', role: 'Keeps the data clean',
      lane: 'RevOps', team: 'operations', status: 'idle', confidence: 0.84, progress: 44,
      mission: 'Keep the CRM clean and the numbers honest — dedupe, log, report.',
      next: 'Dedupe new leads, sync pipeline stages, post the weekly numbers.',
      lastRun: minsAgo(34), blocker: null, soul: 'souls/ledger.md',
      tools: ['CRM hygiene', 'Dedupe', 'Pipeline reporting', 'Scheduling'],
      io: {
        inputs: 'Leads, campaign stats, pipeline stages, meetings.',
        outputs: 'Clean CRM, deduped leads, weekly performance report.',
        errors: 'None. 6 duplicate leads merged today.',
      },
    },
  ],

  // ----- Outreach campaigns -------------------------------------------------
  // channel: email | linkedin | content ; status: draft | warming | live | paused
  campaigns: [
    {
      id: 'c1', name: 'ER Physicians — Cold Email', channel: 'email', owner: 'mailer',
      icp: 'Emergency medicine physicians, US', goalPerDay: 1000, status: 'warming',
      sentToday: 0, totalSent: 0, replies: 0, booked: 0,
      infra: { domains: 10, inboxes: 50, warmDaysLeft: 9 },
      steps: [
        { day: 1, type: 'email', label: 'Problem + benefit (1 line each)' },
        { day: 3, type: 'email', label: 'Proof / quick case' },
        { day: 6, type: 'email', label: 'Short bump' },
        { day: 10, type: 'email', label: 'Breakup' },
      ],
      createdAt: minsAgo(2880),
    },
    {
      id: 'c2', name: 'Medical Directors — LinkedIn', channel: 'linkedin', owner: 'connector',
      icp: 'ER / Hospitalist Medical Directors', goalPerDay: 80, status: 'live',
      sentToday: 32, totalSent: 540, replies: 21, booked: 3,
      infra: null,
      steps: [
        { day: 0, type: 'engage', label: 'React + comment on 2 posts' },
        { day: 2, type: 'connect', label: 'Connect with a 1-line note' },
        { day: 3, type: 'dm', label: 'Value DM + soft CTA' },
        { day: 6, type: 'dm', label: 'Follow-up DM' },
      ],
      createdAt: minsAgo(7200),
    },
    {
      id: 'c3', name: 'Hospitalist — Email Sequence', channel: 'email', owner: 'mailer',
      icp: 'Hospitalist leads, 200+ bed hospitals', goalPerDay: 400, status: 'live',
      sentToday: 180, totalSent: 3200, replies: 74, booked: 6,
      infra: { domains: 5, inboxes: 25, warmDaysLeft: 0 },
      steps: [
        { day: 1, type: 'email', label: 'Pain + 1-line offer' },
        { day: 4, type: 'email', label: 'Case study' },
        { day: 8, type: 'email', label: 'Breakup' },
      ],
      createdAt: minsAgo(10080),
    },
    {
      id: 'c4', name: 'ICU Directors — Multichannel', channel: 'linkedin', owner: 'connector',
      icp: 'ICU / Critical Care Directors', goalPerDay: 60, status: 'draft',
      sentToday: 0, totalSent: 0, replies: 0, booked: 0, infra: null,
      steps: [
        { day: 0, type: 'engage', label: 'Pre-engage' },
        { day: 2, type: 'connect', label: 'Connect + note' },
        { day: 3, type: 'dm', label: 'Value DM' },
      ],
      createdAt: minsAgo(120),
    },
  ],

  // ----- Leads (pipeline) ---------------------------------------------------
  // stage: sourced | contacted | replied | booked | won | passed
  leads: [
    { id: 'l1', name: 'Dr. Otero', title: 'ER Attending', org: 'Valley Medical', specialty: 'Emergency', geo: 'TX', channel: 'email', campaignId: 'c3', stage: 'replied', note: 'Asked for info — wants integration detail.' },
    { id: 'l2', name: 'Dr. Nguyen', title: 'Medical Director, ED', org: 'Mercy Health', specialty: 'Emergency', geo: 'CA', channel: 'linkedin', campaignId: 'c2', stage: 'booked', note: 'Demo booked Thursday 2pm.' },
    { id: 'l3', name: 'Dr. Patel', title: 'Hospitalist Lead', org: 'St. Luke’s', specialty: 'Hospital Med', geo: 'IL', channel: 'email', campaignId: 'c3', stage: 'replied', note: 'Positive — asked about pricing.' },
    { id: 'l4', name: 'Dr. Roberts', title: 'CMO', org: 'Northside', specialty: 'Admin', geo: 'GA', channel: 'linkedin', campaignId: 'c2', stage: 'contacted', note: 'Connected, DM sent.' },
    { id: 'l5', name: 'Dr. Kim', title: 'ICU Director', org: 'Harbor General', specialty: 'Critical Care', geo: 'WA', channel: 'linkedin', campaignId: 'c2', stage: 'contacted', note: 'Pre-engaged, connect pending.' },
    { id: 'l6', name: 'Dr. Alvarez', title: 'ER Attending', org: 'Sunrise', specialty: 'Emergency', geo: 'FL', channel: 'email', campaignId: 'c3', stage: 'sourced', note: 'Verified, queued.' },
    { id: 'l7', name: 'Dr. Chen', title: 'Hospitalist', org: 'Metro Health', specialty: 'Hospital Med', geo: 'NY', channel: 'email', campaignId: 'c3', stage: 'sourced', note: 'Verified, queued.' },
    { id: 'l8', name: 'Dr. Davis', title: 'Medical Director', org: 'Lakeside', specialty: 'Emergency', geo: 'OH', channel: 'linkedin', campaignId: 'c2', stage: 'won', note: 'Pilot agreed 🎉' },
    { id: 'l9', name: 'Dr. Singh', title: 'ER Attending', org: 'Cedar Clinic', specialty: 'Emergency', geo: 'AZ', channel: 'email', campaignId: 'c3', stage: 'passed', note: 'Not now — no budget.' },
    { id: 'l10', name: 'Dr. Wright', title: 'Hospitalist Lead', org: 'Grandview', specialty: 'Hospital Med', geo: 'NC', channel: 'email', campaignId: 'c3', stage: 'contacted', note: 'Opened 3x, no reply yet.' },
  ],

  // ----- Inbox: replies & approvals that need YOU ---------------------------
  // type: reply | approve-copy | approve-leads | book | objection
  inbox: [
    { id: 'i1', type: 'reply', title: 'Dr. Otero replied', detail: '“Interested — how does it fit our EHR workflow?” Closer drafted a reply; approve to send.', leadId: 'l1', urgency: 'high', status: 'open' },
    { id: 'i2', type: 'objection', title: 'HIPAA question from Dr. Roberts', detail: '“Is this HIPAA compliant and where is data stored?” Needs an approved answer before Closer replies.', leadId: 'l4', urgency: 'high', status: 'open' },
    { id: 'i3', type: 'approve-copy', title: 'Approve ER cold-email sequence', detail: 'Scribe drafted the 4-step ER sequence. Approve so Mailer can launch once inboxes finish warming.', campaignId: 'c1', urgency: 'medium', status: 'open' },
    { id: 'i4', type: 'approve-leads', title: 'Approve 250 sourced ER leads', detail: 'Scout verified 250 ER physicians (bounce-checked). Approve to load into the ER campaign.', campaignId: 'c1', urgency: 'medium', status: 'open' },
    { id: 'i5', type: 'book', title: 'Dr. Patel wants pricing + a call', detail: 'Closer can offer two slots. Confirm pilot pricing so it can book.', leadId: 'l3', urgency: 'medium', status: 'open' },
  ],

  // ----- Activity stream ----------------------------------------------------
  activity: [
    { id: 'a1', time: minsAgo(2), actor: 'Mailer (Email)', type: 'email', message: 'Sent 180 hospitalist emails today · 41% open · 7 replies.' },
    { id: 'a2', time: minsAgo(9), actor: 'Connector (LinkedIn)', type: 'linkedin', message: 'Sent 32 DMs to Medical Directors · 6 replies.' },
    { id: 'a3', time: minsAgo(11), actor: 'Closer (Pipeline)', type: 'pipeline', message: 'Booked a demo with Dr. Nguyen (Thu 2pm).' },
    { id: 'a4', time: minsAgo(18), actor: 'Anchor (Infra)', type: 'infra', message: 'Deliverability green · bounce 2.1% · 1 domain needs DMARC.' },
    { id: 'a5', time: minsAgo(6), actor: 'Scout (Leads)', type: 'leads', message: 'Sourced + verified 250 ER physicians — awaiting approval.' },
  ],

  // ----- Playbooks (research-backed, one-click deployable) -------------------
  playbooks: [
    {
      id: 'p1', title: '1,000 cold emails/day — infrastructure', channel: 'email',
      summary: 'The setup that lets you send 1,000/day and still land in the inbox.',
      steps: [
        '~10 sending domains (never your primary; use .com/.co/.io/.net).',
        '~50 inboxes (≈5 per domain), each sending ~20/day.',
        'Warm every new inbox 2–4 weeks before real sends.',
        'SPF + DKIM + DMARC on every domain.',
        'Verified lists only — keep bounce under 3%.',
        'Inbox rotation + stop sending to unengaged contacts.',
      ],
      deploy: { name: 'ER Physicians — Cold Email', channel: 'email', goalPerDay: 1000 },
      tags: ['email', 'deliverability', 'volume'],
    },
    {
      id: 'p2', title: '4-step cold email sequence (doctors)', channel: 'email',
      summary: 'Short, benefit-led, personalized. Built for busy clinicians.',
      steps: [
        'Day 1 — one line of pain, one line of benefit, soft ask.',
        'Day 3 — a quick proof point or mini case.',
        'Day 6 — short bump (“worth a look?”).',
        'Day 10 — breakup (“should I close this out?”).',
      ],
      deploy: { name: 'Doctor Email Sequence', channel: 'email', goalPerDay: 400 },
      tags: ['email', 'copy'],
    },
    {
      id: 'p3', title: 'LinkedIn DM sequence (Medical Directors)', channel: 'linkedin',
      summary: 'Warm first, then connect and DM. ~80/day to stay safe.',
      steps: [
        'Day 0 — react + comment on 2 of their posts.',
        'Day 2 — connect with a 1-line, specific note.',
        'Day 3 — value DM + soft CTA (no pitch wall).',
        'Day 6 — one follow-up, then stop.',
        'Use Sales Navigator filters: title, specialty, org size.',
      ],
      deploy: { name: 'Medical Directors — LinkedIn', channel: 'linkedin', goalPerDay: 80 },
      tags: ['linkedin', 'copy'],
    },
    {
      id: 'p4', title: 'Reply → booked demo', channel: 'pipeline',
      summary: 'Turn a reply into a calendar invite. Speed wins.',
      steps: [
        'Reply within the hour while interest is hot.',
        'One qualifying question, then offer two specific slots.',
        'Objection “HIPAA?” → lead with compliance + data location.',
        'Objection “no time” → 12-min demo, their workflow only.',
        'Always confirm with a calendar invite, not a “let me know”.',
      ],
      deploy: null,
      tags: ['pipeline', 'closing'],
    },
    {
      id: 'p5', title: 'Deliverability checklist', channel: 'email',
      summary: 'Stay out of spam at volume.',
      steps: [
        'Warm new mailboxes 2–4 weeks before sending.',
        'Test inbox placement before each launch.',
        'Rotate inboxes; cap ~20/inbox/day.',
        'Suppress bounces and unengaged contacts.',
        'Monitor domain health continuously.',
      ],
      deploy: null,
      tags: ['email', 'deliverability'],
    },
  ],
};

function minsAgo(m) { return new Date(Date.now() - m * 60000).toISOString(); }

if (typeof window !== 'undefined') window.LUINUS_SEED = SEED;
