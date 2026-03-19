import { useState, useEffect, useRef, useCallback } from 'react';
import './app.css';

// ── TYPES ────────────────────────────────────────────────────────────────────
type View = 'dashboard' | 'workspaces' | 'calls' | 'results' | 'agents' | 'settings';

interface Workspace { id: number; name: string; desc: string; agents: number; calls: number; avgScore: number; }
interface Call { id: number; name: string; agent: string; date: string; client: string; duration: string; status: 'done' | 'proc'; score: number | null; taskId?: string; assessmentData?: any; transcriptText?: string; }
interface TranscriptLine { time: string; speaker: string; txt: string; }

// ── STATIC DATA ───────────────────────────────────────────────────────────────
const CREDS: Record<string, string> = { 'admin@falcon.ma': 'falcon2024', 'demo@falcon.ma': 'demo123' };

const WORKSPACES: Workspace[] = [
  { id: 1, name: 'Call Center Q1',    desc: 'Primary customer support channel for Q1 2026',    agents: 12, calls: 1240, avgScore: 88 },
  { id: 2, name: 'Sales March',       desc: 'Outbound sales campaign for enterprise leads',      agents: 8,  calls: 450,  avgScore: 92 },
  { id: 3, name: 'Technical Support', desc: 'Tier 2 technical escalation workspace',             agents: 5,  calls: 210,  avgScore: 85 },
];

const INITIAL_CALLS: Record<number, Call[]> = {
  1: [
    { id: 101, name: 'Enterprise Onboarding #1042', agent: 'Sarah Chen',    date: '2026-03-18', client: 'Maroc Telecom', duration: '12:34', status: 'done', score: 92 },
    { id: 102, name: 'Server Migration Support',    agent: 'Marcus Johnson', date: '2026-03-17', client: 'Orange MA',     duration: '08:21', status: 'done', score: 87 },
    { id: 103, name: 'Acme Corp Discovery',          agent: 'Emily Rodriguez',date: '2026-03-17', client: 'Acme Corp',     duration: '22:15', status: 'done', score: 95 },
    { id: 104, name: 'Billing Dispute Resolution',   agent: 'David Kim',     date: '2026-03-19', client: 'Maroc Telecom', duration: '06:48', status: 'proc', score: null },
  ],
  2: [
    { id: 201, name: 'Enterprise Lead Follow-up', agent: 'Sarah Chen',    date: '2026-03-18', client: 'Gamma SA',   duration: '18:12', status: 'done', score: 94 },
    { id: 202, name: 'Product Demo — Pro Plan',    agent: 'Emily Rodriguez',date: '2026-03-15', client: 'Beta Ltd',   duration: '35:04', status: 'done', score: 91 },
  ],
  3: [
    { id: 301, name: 'Network Outage Resolution',  agent: 'Marcus Johnson', date: '2026-03-17', client: 'INWI',       duration: '14:05', status: 'done', score: 83 },
    { id: 302, name: 'VPN Configuration Support',  agent: 'David Kim',     date: '2026-03-14', client: 'Acme Corp',  duration: '09:30', status: 'done', score: 86 },
  ],
};

const AGENTS = [
  { name: 'Sarah Chen',      role: 'Senior Sales Agent',    score: 94, calls: 234, avg: '15:30', trend: 'up'   },
  { name: 'Marcus Johnson',  role: 'Tech Support Lead',     score: 87, calls: 189, avg: '11:20', trend: 'flat' },
  { name: 'Emily Rodriguez', role: 'Sales Representative',  score: 91, calls: 156, avg: '18:45', trend: 'up'   },
  { name: 'David Kim',       role: 'Customer Success',      score: 82, calls: 198, avg: '08:15', trend: 'dn'   },
  { name: 'Fatima Zahra',    role: 'Onboarding Specialist', score: 89, calls: 142, avg: '12:40', trend: 'up'   },
  { name: 'Mehdi Benmoussa', role: 'Retention Specialist',  score: 96, calls: 112, avg: '09:55', trend: 'up'   },
];

const PROCESSING_STEPS = ['Transcribing audio', 'Translating Darija', 'Generating summary', 'Assessing agent performance', 'Finalizing report'];

const STEP_MAP: Record<string, number> = {
  'Starting': 0, 'Transcription Status (Audio to Text)': 0, 'Using existing script': 0,
  'Analysis Status (Summary & Assessment Generation)': 2, 'File Formatting (DOCX & Excel Preparation)': 4, 'Finished': 4,
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function scoreColor(n: number) { return n >= 80 ? 'green' : n >= 60 ? 'amber' : 'red'; }

function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

function parseTranscript(text: string): TranscriptLine[] {
  const seen: Record<string, string> = {};
  return text.split('\n').flatMap(line => {
    const m = line.match(/^\[([^\]]+)\]\s+([^:]+):\s*(.+)$/);
    if (!m) return [];
    const [, time, speaker, txt] = m;
    if (!seen[speaker]) seen[speaker] = Object.keys(seen).length === 0 ? 'agent' : 'client';
    return [{ time, speaker: seen[speaker], txt }];
  });
}

function fakeAssessment(call: Call) {
  const s = call.score ?? 80;
  return {
    call_summary: `The call was conducted by ${call.agent} on ${call.date} with ${call.client}. The client raised a billing discrepancy related to a plan migration. The agent identified a duplicate charge, applied a credit of 45 MAD, and confirmed resolution within 24 hours. The client expressed satisfaction at close.`,
    quantitative: { talk_time: call.duration, resolution_rate: `${Math.min(99, s)}%`, transfers: 1, avg_hold_time: '45s', csat_score: `${Math.round(s / 10)}/10`, escalations: 0 },
    qualitative_observations: [
      { tag: 'positive', text: 'Agent maintained a calm and professional tone throughout the call, using appropriate Darija formalities.' },
      { tag: 'positive', text: 'Problem was identified quickly without unnecessary back-and-forth, demonstrating good product knowledge.' },
      { tag: 'negative', text: 'Agent deviated from the standard script during the resolution offer phase, skipping the mandatory disclosure clause.' },
      { tag: 'neutral',  text: "Client tone shifted from frustrated to neutral by mid-call; full satisfaction was achieved by end of interaction." },
    ],
    agent_performance: { communication: Math.min(100, s + 8), problem_resolution: Math.min(100, s + 12), empathy: Math.max(40, s - 6), script_adherence: Math.max(40, s - 19), response_time: Math.min(100, s + 5), overall_score: s },
    final_verdict: s >= 90 ? 'Excellent' : s >= 75 ? 'Good' : s >= 60 ? 'Average' : 'Poor',
  };
}

const FAKE_TRANSCRIPT: TranscriptLine[] = [
  { time: '0:04', speaker: 'client', txt: "Mrhba, 3andi mochkila m3a l-factoura dyali dyal had chhar..." },
  { time: '0:09', speaker: 'agent',  txt: "Ahlan wa sahlan, ana ghadi n3awnek. Wash momken t3tini raqm l-compte dyalk?" },
  { time: '0:17', speaker: 'client', txt: "Yeh, huwa 7734-B. Kayen charge zdada ma fahemtch." },
  { time: '0:31', speaker: 'agent',  txt: "Fhemt, ghadi nchouf l-compte dyalk daba. Iyeh, kayna mochkila f migration dyal l-forfait. Ghadi nsifet credit d 45 dirham." },
  { time: '0:52', speaker: 'client', txt: "Choukran bzzaf, had service mzyan." },
  { time: '0:58', speaker: 'agent',  txt: "La shokr 3la wajib. Had l-credit ghadi yban f compte f 24 sa3a. Ma3a salama." },
];

// ── SVG ICONS ─────────────────────────────────────────────────────────────────
const IcoDashboard = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1.2"/><rect x="9" y="1" width="6" height="6" rx="1.2"/><rect x="1" y="9" width="6" height="6" rx="1.2"/><rect x="9" y="9" width="6" height="6" rx="1.2"/></svg>;
const IcoWorkspace = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 4h14M1 4v9a1 1 0 001 1h12a1 1 0 001-1V4M1 4l2-3h10l2 3"/></svg>;
const IcoAgents = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2.5-5 5-5s5 2 5 5"/><circle cx="12" cy="5" r="2"/><path d="M14 14c0-2-1-3.5-2-4"/></svg>;
const IcoSettings = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/></svg>;
const IcoPhone = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 1h3l1.5 4L6 6.5c1 2 2.5 3.5 4.5 4.5L12 9.5l4 1.5v3a1 1 0 01-1 1C6 15 1 10 1 2a1 1 0 011-1z"/></svg>;
const IcoPeople = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2.5-5 5-5s5 2 5 5"/><circle cx="12" cy="5" r="2"/><path d="M14 14c0-2-1-3.5-2-4"/></svg>;
const IcoTrend = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12l4-4 3 3 5-6"/><path d="M11 5h4v4"/></svg>;
const IcoGrid = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>;
const IcoClock = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>;
const IcoChevron = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--muted)" strokeWidth="1.5"><path d="M6 3l5 5-5 5"/></svg>;

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [isLoggedIn, setIsLoggedIn]       = useState(false);
  const [currentUser, setCurrentUser]     = useState('');
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPass, setLoginPass]         = useState('');
  const [loginError, setLoginError]       = useState(false);
  const [view, setView]                   = useState<View>('dashboard');
  const [currentWS, setCurrentWS]         = useState<Workspace | null>(null);
  const [currentCall, setCurrentCall]     = useState<Call | null>(null);
  const [calls, setCalls]                 = useState(INITIAL_CALLS);
  const [resultsPhase, setResultsPhase]   = useState<'processing' | 'done'>('done');
  const [activeStep, setActiveStep]       = useState(0);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [transcriptLines, setTranscriptLines]   = useState<TranscriptLine[]>([]);
  const [activeTaskId, setActiveTaskId]   = useState<string | null>(null);
  const [modalOpen, setModalOpen]         = useState(false);
  const [uploadFile, setUploadFile]       = useState<File | null>(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [uploadForm, setUploadForm]       = useState({ name: '', agent: '', date: '', client: '' });
  const [isUploading, setIsUploading]     = useState(false);
  const [toast, setToast]                 = useState('');
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const stepTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  // ── POLLING ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeTaskId || resultsPhase !== 'processing') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${activeTaskId}`);
        if (!res.ok) return;
        const data = await res.json();
        const backendStep = STEP_MAP[data.step] ?? activeStep;
        setActiveStep(prev => Math.max(prev, backendStep));
        if (data.status === 'completed') {
          clearInterval(interval);
          if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
          setActiveStep(4);
          let lines: TranscriptLine[] = [];
          if (data.base_name) {
            try {
              const r = await fetch(`/api/content/${data.base_name}_falcon.docx`);
              if (r.ok) { const d = await r.json(); lines = parseTranscript(d.content || ''); }
            } catch (_) {}
          }
          setTranscriptLines(lines.length ? lines : FAKE_TRANSCRIPT);
          const assessment = data.assessment_data || {};
          setAssessmentResult(assessment);
          if (currentWS && currentCall) {
            const score = assessment?.agent_performance?.overall_score ?? null;
            setCalls(prev => ({ ...prev, [currentWS.id]: prev[currentWS.id].map(c => c.id === currentCall.id ? { ...c, status: 'done', score, assessmentData: assessment } : c) }));
          }
          setTimeout(() => setResultsPhase('done'), 300);
        }
        if (data.status === 'failed') { clearInterval(interval); showToast('Analysis failed.'); }
      } catch (_) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [activeTaskId, resultsPhase]);

  // ── STEP ANIMATION ───────────────────────────────────────────────────────
  const startStepAnimation = () => {
    let i = 0;
    const advance = () => {
      if (i < PROCESSING_STEPS.length - 1) {
        setActiveStep(i); i++;
        stepTimerRef.current = setTimeout(advance, 900 + Math.random() * 400);
      }
    };
    advance();
  };

  // ── AUTH ─────────────────────────────────────────────────────────────────
  const doLogin = () => {
    if (CREDS[loginEmail] === loginPass) { setLoginError(false); setCurrentUser(loginEmail); setIsLoggedIn(true); }
    else setLoginError(true);
  };

  // ── NAVIGATION ───────────────────────────────────────────────────────────
  const openWorkspace = (ws: Workspace) => { setCurrentWS(ws); setView('calls'); };
  const openCall = (call: Call) => {
    if (call.status === 'proc') { showToast('Still processing…'); return; }
    setCurrentCall(call);
    setAssessmentResult(call.assessmentData || fakeAssessment(call));
    setTranscriptLines(call.transcriptText ? parseTranscript(call.transcriptText) : FAKE_TRANSCRIPT);
    setResultsPhase('done');
    setView('results');
  };
  const backFromResults = () => { setView('calls'); setActiveTaskId(null); };

  // ── UPLOAD ───────────────────────────────────────────────────────────────
  const isModalReady = !!uploadFile && !!uploadForm.name.trim() && !!uploadForm.agent.trim() && !!uploadForm.date;

  const startAnalysis = async () => {
    if (!uploadFile || !isModalReady || !currentWS) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error();
      const { filename } = await uploadRes.json();
      const processRes = await fetch('/api/process', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, project_id: `WS-${currentWS.id}`, project_name: currentWS.name, agent_name: uploadForm.agent, skip_transcription: uploadFile.name.endsWith('.docx') }),
      });
      if (!processRes.ok) throw new Error();
      const { task_id } = await processRes.json();
      const newCall: Call = { id: Date.now(), name: uploadForm.name, agent: uploadForm.agent, date: uploadForm.date, client: uploadForm.client || '—', duration: '—', status: 'proc', score: null, taskId: task_id };
      setCalls(prev => ({ ...prev, [currentWS.id]: [newCall, ...(prev[currentWS.id] || [])] }));
      setCurrentCall(newCall); setActiveTaskId(task_id); setResultsPhase('processing'); setActiveStep(0);
      setModalOpen(false); setView('results'); startStepAnimation();
    } catch { showToast('Failed to start analysis.'); }
    finally { setIsUploading(false); }
  };

  // ── BREADCRUMB ───────────────────────────────────────────────────────────
  const topbarTitle = () => {
    if (view === 'calls' && currentWS) return `Workspaces / ${currentWS.name}`;
    if (view === 'results' && currentCall) return currentCall.name;
    return ({ dashboard: 'Falcon Call AI', workspaces: 'Workspaces', agents: 'Agents', settings: 'Settings' } as any)[view] || 'Falcon Call AI';
  };

  // ── RESULTS RENDER ───────────────────────────────────────────────────────
  const renderAssessmentBlocks = (data: any, lines: TranscriptLine[]) => {
    const perf = data?.agent_performance || {};
    const quant = data?.quantitative || {};
    const qual: any[] = data?.qualitative_observations || [];
    const quantItems = [
      { val: quant.talk_time || '—', label: 'Talk time', c: '' },
      { val: quant.resolution_rate || '—', label: 'Resolution rate', c: 'green' },
      { val: String(quant.transfers ?? '—'), label: 'Transfers', c: '' },
      { val: quant.avg_hold_time || '—', label: 'Avg hold time', c: '' },
      { val: quant.csat_score || '—', label: 'CSAT score', c: 'green' },
      { val: String(quant.escalations ?? '—'), label: 'Escalations', c: 'green' },
    ];
    const perfItems = [
      { label: 'Communication',     key: 'communication' },
      { label: 'Problem Resolution',key: 'problem_resolution' },
      { label: 'Empathy',           key: 'empathy' },
      { label: 'Script Adherence',  key: 'script_adherence' },
      { label: 'Response Time',     key: 'response_time' },
      { label: 'Overall Score',     key: 'overall_score' },
    ];
    return (<>
      <div className="res-block">
        <div className="res-block-hd"><h3>Quantitative Info</h3></div>
        <div className="res-block-body"><div className="quant-grid">{quantItems.map((q, i) => <div key={i} className="qc"><div className={`qc-val ${q.c}`}>{q.val}</div><div className="qc-label">{q.label}</div></div>)}</div></div>
      </div>
      <div className="res-block">
        <div className="res-block-hd"><h3>Qualitative Info</h3></div>
        <div className="res-block-body"><div className="qual-list">{qual.map((q, i) => <div key={i} className="qual-item"><span className={`qual-tag ${q.tag === 'positive' ? 'pos' : q.tag === 'negative' ? 'neg' : 'neu'}`}>{q.tag}</span><div className="qual-text">{q.text}</div></div>)}</div></div>
      </div>
      <div className="res-block">
        <div className="res-block-hd"><h3>Transcript</h3></div>
        <div className="res-block-body"><div className="tr-block">{lines.map((l, i) => <div key={i} className="tr-line"><span className={`tr-sp ${l.speaker}`}>{l.speaker}</span><span className="tr-txt">{l.txt}</span><span className="tr-time">{l.time}</span></div>)}</div></div>
      </div>
      <div className="res-block">
        <div className="res-block-hd"><h3>Agent Assessment</h3></div>
        <div className="res-block-body"><div className="assess-grid">{perfItems.map(item => { const val = perf[item.key] ?? 0; const c = scoreColor(val); return (<div key={item.key} className="ag"><div className="ag-label">{item.label}</div><div className="ag-bar"><div className={`ag-fill ${c}`} style={{ width: `${val}%` }} /></div><div className="ag-score">{val}<span>/100</span></div></div>); })}</div></div>
      </div>
    </>);
  };

  // ── DASHBOARD DATA ────────────────────────────────────────────────────────
  const recentRows = [
    { name: 'Enterprise Onboarding #1042', agent: 'Sarah Chen',     ws: 'w1', duration: '12:34', status: 'done', score: 92 },
    { name: 'Server Migration Support',    agent: 'Marcus Johnson',  ws: 'w3', duration: '08:21', status: 'done', score: 87 },
    { name: 'Acme Corp Discovery',          agent: 'Emily Rodriguez', ws: 'w2', duration: '22:15', status: 'done', score: 95 },
    { name: 'Billing Dispute Resolution',   agent: 'David Kim',       ws: 'w1', duration: '06:48', status: 'proc', score: null },
  ];

  // ── NAV ITEMS ─────────────────────────────────────────────────────────────
  const NAV = [
    { id: 'dashboard',   label: 'Dashboard',   icon: <IcoDashboard /> },
    { id: 'workspaces',  label: 'Workspaces',  icon: <IcoWorkspace /> },
    { id: 'agents',      label: 'Agents',      icon: <IcoAgents /> },
  ] as const;

  // ─────────────────────────────────────────────────────────────────────────
  if (!isLoggedIn) return (
    <div id="pg-login">
      <div className="login-top">
        <div className="eyebrow">◆ Enterprise Platform</div>
        <h1>Falcon <b>Call</b> AI</h1>
        <p>Moroccan Darija · Transcription &amp; Analysis</p>
      </div>
      <div className="login-box">
        <label className="lbl">Email</label>
        <input className={`inp ${loginError ? 'err' : ''}`} type="text" placeholder="you@falconcall.ma" value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setLoginError(false); }} onKeyDown={e => e.key === 'Enter' && doLogin()} />
        <label className="lbl">Password</label>
        <input className={`inp ${loginError ? 'err' : ''}`} type="password" placeholder="••••••••" value={loginPass} onChange={e => { setLoginPass(e.target.value); setLoginError(false); }} onKeyDown={e => e.key === 'Enter' && doLogin()} />
        {loginError && <div className="err-txt">Incorrect email or password.</div>}
        <button className="btn-cta" onClick={doLogin}>Sign in →</button>
        <div className="login-hint">Demo &nbsp;admin@falcon.ma &nbsp;/&nbsp; falcon2024</div>
      </div>
    </div>
  );

  return (
    <div id="app">
      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🚀</div>
          <div className="brand-name">Falcon Call AI</div>
        </div>

        <div className="nav-section-label">Main</div>
        <nav className="nav">
          {NAV.map(item => (
            <div key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id as View)}>
              {item.icon}{item.label}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
            <IcoSettings />Settings
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="main">
        <div className="topbar">
          <IcoGrid />
          <span className="topbar-title">{topbarTitle()}</span>
        </div>

        {/* Dashboard */}
        {view === 'dashboard' && (
          <div className="page fade">
            <div className="page-hd"><h2>Dashboard</h2><p>Overview of your call intelligence platform.</p></div>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-card-top"><span className="stat-card-label">Total Calls</span><span className="stat-card-icon"><IcoPhone /></span></div><div className="stat-card-val">1,274</div><div className="stat-delta up">↗ +12.5% vs last month</div></div>
              <div className="stat-card"><div className="stat-card-top"><span className="stat-card-label">Active Agents</span><span className="stat-card-icon"><IcoPeople /></span></div><div className="stat-card-val">6</div><div className="stat-delta up">↗ +2 vs last month</div></div>
              <div className="stat-card"><div className="stat-card-top"><span className="stat-card-label">Avg Score</span><span className="stat-card-icon"><IcoTrend /></span></div><div className="stat-card-val">89.8</div><div className="stat-delta up">↗ +3.2% vs last month</div></div>
              <div className="stat-card"><div className="stat-card-top"><span className="stat-card-label">Workspaces</span><span className="stat-card-icon"><IcoGrid /></span></div><div className="stat-card-val">3</div><div className="stat-delta">↘ 0 vs last month</div></div>
            </div>
            <div className="section-title">Recent Transcriptions</div>
            <div className="recent-table">
              <div className="rt-head"><div>Title</div><div>Agent</div><div>Workspace</div><div>Duration</div><div>Status</div><div>Score</div></div>
              {recentRows.map((r, i) => (
                <div key={i} className="rt-row">
                  <div className="rt-name">{r.name}</div>
                  <div className="rt-sub">{r.agent}</div>
                  <div className="rt-sub">{r.ws}</div>
                  <div className="rt-sub">{r.duration}</div>
                  <div><span className={`badge ${r.status}`}><span className="badge-dot" />{r.status === 'done' ? 'completed' : 'processing'}</span></div>
                  <div className="score-val">{r.score ?? <span style={{ color: 'var(--muted)' }}>—</span>}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workspaces */}
        {view === 'workspaces' && (
          <div className="page fade">
            <div className="ws-page-hd">
              <div className="page-hd" style={{ marginBottom: 0 }}><h2>Workspaces</h2><p>Manage your call analysis environments.</p></div>
              <button className="btn-new-ws" onClick={() => showToast('Create workspace — coming soon')}>+ New Workspace</button>
            </div>
            <div className="ws-grid">
              {WORKSPACES.map(ws => (
                <div key={ws.id} className="ws-card" onClick={() => openWorkspace(ws)}>
                  <div className="ws-card-hd">
                    <div className="ws-card-name">{ws.name}</div>
                    <span className="ws-active">active</span>
                  </div>
                  <div className="ws-card-desc">{ws.desc}</div>
                  <div className="ws-card-stats">
                    <div className="ws-stat"><IcoPeople />{ws.agents} agents</div>
                    <div className="ws-stat"><IcoPhone />{ws.calls.toLocaleString()} calls</div>
                    <div className="ws-stat"><IcoTrend />Avg {ws.avgScore}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calls */}
        {view === 'calls' && currentWS && (
          <div className="page fade">
            <div className="back-btn" onClick={() => setView('workspaces')}>← Workspaces</div>
            <div className="calls-hd">
              <div className="calls-hd-info"><h2>{currentWS.name}</h2><p>{currentWS.desc}</p></div>
              <button className="btn-add-call" onClick={() => { setUploadFile(null); setUploadForm({ name: '', agent: '', date: '', client: '' }); setModalOpen(true); }}>+ Add Call</button>
            </div>
            <div className="calls-list">
              {(calls[currentWS.id] || []).map(c => (
                <div key={c.id} className="call-row" onClick={() => openCall(c)}>
                  <div className="call-row-left">
                    <div className="call-row-name">{c.name}</div>
                    <div className="call-row-meta"><span>{c.agent}</span><span>·</span><span>{c.date}</span><span>·</span><span>{c.client}</span><span>·</span><span>{c.duration}</span></div>
                  </div>
                  <div className="call-row-right">
                    <span className={`badge ${c.status}`}><span className="badge-dot" />{c.status === 'done' ? 'completed' : 'processing'}</span>
                    <div className="call-score">{c.score !== null ? c.score : <span style={{ color: 'var(--muted)' }}>—</span>}</div>
                    <IcoChevron />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {view === 'results' && (
          <div className="results-view">
            <div className="results-view-back"><div className="back-btn" onClick={backFromResults}>← Back to calls</div></div>
            {resultsPhase === 'processing' && (
              <div id="pg-processing">
                <div className="proc-ring" />
                <div className="proc-title">Analyzing call…</div>
                <div className="proc-steps">
                  {PROCESSING_STEPS.map((step, i) => (
                    <div key={i} className={`pstep ${i === activeStep ? 'active' : i < activeStep ? 'done' : ''}`}>
                      <span className="pstep-dot" />{step}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {resultsPhase === 'done' && assessmentResult && currentCall && (
              <div id="pg-results">
                <div className="res-hero">
                  <div><div className="res-title">{currentCall.name}</div><div className="res-meta">{currentCall.agent} · {currentCall.date} · {currentCall.client}</div></div>
                  <div className="badge-complete">✓ Complete</div>
                </div>
                <div className="info-strip">
                  <div className="ic"><div className="ic-label">Duration</div><div className="ic-val green">{currentCall.duration}</div></div>
                  <div className="ic"><div className="ic-label">File size</div><div className="ic-val">—</div></div>
                  <div className="ic"><div className="ic-label">Verdict</div><div className="ic-val amber">{assessmentResult.final_verdict || '—'}</div></div>
                  <div className="ic"><div className="ic-label">Language</div><div className="ic-val" style={{ fontSize: '14px' }}>Darija / AR</div></div>
                </div>
                <div className="res-block">
                  <div className="res-block-hd"><h3>Call Summary</h3></div>
                  <div className="res-block-body"><div className="summary-text">{assessmentResult.call_summary}</div></div>
                </div>
                {renderAssessmentBlocks(assessmentResult, transcriptLines)}
              </div>
            )}
          </div>
        )}

        {/* Agents */}
        {view === 'agents' && (
          <div className="page fade">
            <div className="page-hd"><h2>Agents</h2><p>Monitor and compare agent performance across all projects.</p></div>
            <div className="agents-grid">
              {AGENTS.map(a => (
                <div key={a.name} className="agent-card">
                  <div className={`agent-trend ${a.trend === 'up' ? 'up' : a.trend === 'dn' ? 'dn' : ''}`}>{a.trend === 'up' ? '↗' : a.trend === 'dn' ? '↘' : '—'}</div>
                  <div className="agent-card-hd">
                    <div className="agent-av">{initials(a.name)}</div>
                    <div className="agent-info">
                      <div className="agent-name">{a.name}</div>
                      <div className="agent-role">{a.role}</div>
                    </div>
                  </div>
                  <div className="agent-score-row">
                    <span className="agent-score">{a.score}</span>
                    <span className="agent-score-max">/ 100</span>
                  </div>
                  <div className="agent-meta">
                    <div className="agent-meta-item"><IcoPhone />{a.calls} calls</div>
                    <div className="agent-meta-item"><IcoClock />{a.avg} avg</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {view === 'settings' && (
          <div className="page fade">
            <div className="page-hd"><h2>Settings</h2><p>Manage your account and platform configuration.</p></div>
            <div className="settings-wrap">
              <div className="settings-section">
                <h3>Profile</h3>
                <div className="sf"><label>Name</label><input defaultValue="Admin User" /></div>
                <div className="sf"><label>Email</label><input defaultValue={currentUser} /></div>
                <button className="btn-save" onClick={() => showToast('Changes saved')}>Save Changes</button>
                <div style={{ clear: 'both' }} />
              </div>
              <div className="settings-section">
                <h3>API Configuration</h3>
                <div className="sf"><label>Gemini API Key</label><input type="password" placeholder="AIza••••••••••••••••••••••••••••••••••" /></div>
                <button className="btn-save" onClick={() => showToast('API key updated')}>Save Changes</button>
                <div style={{ clear: 'both' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── UPLOAD MODAL ── */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
        <div className="modal">
          <div className="modal-title">Add a Call</div>
          <div className="modal-sub">Upload an audio file to analyze.</div>
          <div
            className={`drop-zone ${isDragging ? 'drag' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
          >
            <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.docx" onChange={e => setUploadFile(e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            <div className="drop-icon">⬆</div>
            <div className="drop-label">Drop file or click to browse</div>
            <div className="drop-hint">.mp3 &nbsp;.wav &nbsp;.m4a &nbsp;.docx</div>
            {uploadFile && <div className="drop-file">📎 {uploadFile.name}</div>}
          </div>
          <div className="modal-grid">
            <div className="mf"><label>Call Name *</label><input placeholder="Onboarding #1042" value={uploadForm.name} onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="mf"><label>Agent Name *</label><input placeholder="Sarah Chen" value={uploadForm.agent} onChange={e => setUploadForm(p => ({ ...p, agent: e.target.value }))} /></div>
            <div className="mf"><label>Call Date *</label><input type="date" value={uploadForm.date} onChange={e => setUploadForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div className="mf"><label>Client</label><input placeholder="Maroc Telecom" value={uploadForm.client} onChange={e => setUploadForm(p => ({ ...p, client: e.target.value }))} /></div>
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-analyze" disabled={!isModalReady || isUploading} onClick={startAnalysis}>{isUploading ? 'Uploading…' : 'Analyze →'}</button>
          </div>
        </div>
      </div>

      {/* ── TOAST ── */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
