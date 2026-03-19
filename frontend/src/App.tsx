import { useState, useEffect, useRef, useCallback } from 'react';
import './app.css';

// ── TYPES ──────────────────────────────────────────────────────────────────
type View = 'dashboard' | 'workspaces' | 'calls' | 'results' | 'agents' | 'settings';

interface Workspace {
  id: number;
  name: string;
  desc: string;
  agents: number;
  calls: number;
  avgScore: number;
  date: string;
}

interface Call {
  id: number;
  name: string;
  agent: string;
  date: string;
  client: string;
  duration: string;
  status: 'done' | 'proc';
  score: number | null;
  taskId?: string;
  assessmentData?: any;
  transcriptText?: string;
}

interface TranscriptLine {
  time: string;
  speaker: string;
  txt: string;
}

// ── STATIC DATA ─────────────────────────────────────────────────────────────
const CREDS: Record<string, string> = {
  'admin@falcon.ma': 'falcon2024',
  'demo@falcon.ma': 'demo123',
};

const WORKSPACES: Workspace[] = [
  { id: 1, name: 'Enterprise Onboarding', desc: 'New enterprise client onboarding flow', agents: 4, calls: 12, avgScore: 91, date: '2026-01-15' },
  { id: 2, name: 'Tech Support Q1', desc: 'Q1 technical support quality improvement', agents: 3, calls: 8, avgScore: 85, date: '2026-01-01' },
  { id: 3, name: 'Sales Pipeline', desc: 'Sales call analysis and conversion optimization', agents: 5, calls: 18, avgScore: 89, date: '2025-11-20' },
  { id: 4, name: 'Customer Retention', desc: 'Retention and churn prevention calls', agents: 3, calls: 6, avgScore: 82, date: '2025-12-10' },
];

const INITIAL_CALLS: Record<number, Call[]> = {
  1: [
    { id: 101, name: 'Customer Onboarding #1042', agent: 'Youssef El Fassi', date: '2026-03-18', client: 'Maroc Telecom', duration: '12:34', status: 'done', score: 92 },
    { id: 102, name: 'Onboarding Follow-up #1043', agent: 'Fatima Zahra', date: '2026-03-15', client: 'Orange MA', duration: '08:12', status: 'done', score: 88 },
    { id: 103, name: 'Enterprise Setup Call', agent: 'Youssef El Fassi', date: '2026-03-10', client: 'INWI', duration: '22:45', status: 'proc', score: null },
  ],
  2: [
    { id: 201, name: 'Technical Support — Server Issue', agent: 'Mehdi Benmoussa', date: '2026-03-17', client: 'Acme Corp', duration: '08:21', status: 'done', score: 87 },
    { id: 202, name: 'Network Outage Resolution', agent: 'Sara Alami', date: '2026-03-12', client: 'Beta Ltd', duration: '14:05', status: 'done', score: 79 },
  ],
  3: [
    { id: 301, name: 'Sales Discovery — Acme Corp', agent: 'Youssef El Fassi', date: '2026-03-17', client: 'Acme Corp', duration: '22:15', status: 'done', score: 95 },
    { id: 302, name: 'Product Demo — Enterprise Plan', agent: 'Fatima Zahra', date: '2026-03-14', client: 'Gamma SA', duration: '35:12', status: 'done', score: 91 },
  ],
  4: [
    { id: 401, name: 'Billing Inquiry Resolution', agent: 'Sara Alami', date: '2026-03-19', client: 'Maroc Telecom', duration: '06:48', status: 'proc', score: null },
    { id: 402, name: 'Churn Prevention Call', agent: 'Mehdi Benmoussa', date: '2026-03-11', client: 'Orange MA', duration: '11:30', status: 'done', score: 84 },
  ],
};

const AGENTS = [
  { name: 'Youssef El Fassi', role: 'Senior Sales Agent', score: 94, calls: 234, avg: '15:30', trend: 'up' },
  { name: 'Fatima Zahra', role: 'Onboarding Specialist', score: 91, calls: 167, avg: '12:40', trend: 'up' },
  { name: 'Mehdi Benmoussa', role: 'Tech Support Lead', score: 87, calls: 189, avg: '11:20', trend: 'flat' },
  { name: 'Sara Alami', role: 'Customer Success', score: 82, calls: 198, avg: '08:15', trend: 'dn' },
  { name: 'Karim Tazi', role: 'Sales Representative', score: 89, calls: 142, avg: '20:10', trend: 'up' },
  { name: 'Nadia Benali', role: 'Retention Specialist', score: 96, calls: 112, avg: '09:55', trend: 'up' },
];

const PROCESSING_STEPS = [
  'Transcribing audio',
  'Translating Darija',
  'Generating summary',
  'Assessing agent performance',
  'Finalizing report',
];

const STEP_MAP: Record<string, number> = {
  'Starting': 0,
  'Transcription Status (Audio to Text)': 0,
  'Using existing script': 0,
  'Analysis Status (Summary & Assessment Generation)': 2,
  'File Formatting (DOCX & Excel Preparation)': 4,
  'Finished': 4,
};

// ── HELPERS ─────────────────────────────────────────────────────────────────
function scoreColor(n: number) {
  if (n >= 80) return 'teal';
  if (n >= 60) return 'amber';
  return 'red';
}

function parseTranscript(text: string): TranscriptLine[] {
  const lines = text.split('\n');
  const result: TranscriptLine[] = [];
  const seenSpeakers: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^\[([^\]]+)\]\s+([^:]+):\s*(.+)$/);
    if (!m) continue;
    const [, time, speaker, txt] = m;
    if (!seenSpeakers[speaker]) {
      seenSpeakers[speaker] = Object.keys(seenSpeakers).length === 0 ? 'agent' : 'client';
    }
    result.push({ time, speaker: seenSpeakers[speaker], txt });
  }
  return result;
}

// Fake demo assessment data for pre-existing hardcoded calls
function fakeAssessment(call: Call) {
  const s = call.score ?? 80;
  return {
    call_summary: `The call was conducted by agent ${call.agent} on ${call.date} with client ${call.client}. The client raised a billing discrepancy related to a plan migration. The agent identified a duplicate charge, applied a credit of 45 MAD, and confirmed resolution within 24 hours. The client expressed satisfaction at close.`,
    quantitative: {
      talk_time: call.duration,
      resolution_rate: `${Math.min(99, s)}%`,
      transfers: 1,
      avg_hold_time: '45s',
      csat_score: `${Math.round(s / 10)}/10`,
      escalations: 0,
    },
    qualitative_observations: [
      { tag: 'positive', text: 'Agent maintained a calm and professional tone throughout the call, using appropriate Darija formalities when addressing the client.' },
      { tag: 'positive', text: 'Problem was identified quickly without unnecessary back-and-forth, demonstrating good product knowledge.' },
      { tag: 'negative', text: 'Agent deviated from the standard script during the resolution offer phase, skipping the mandatory disclosure clause.' },
      { tag: 'neutral', text: 'Client tone shifted from frustrated to neutral by mid-call; full satisfaction was achieved by end of interaction.' },
    ],
    agent_performance: {
      communication: Math.min(100, s + 8),
      problem_resolution: Math.min(100, s + 12),
      empathy: Math.max(40, s - 6),
      script_adherence: Math.max(40, s - 19),
      response_time: Math.min(100, s + 5),
      overall_score: s,
    },
    final_verdict: s >= 90 ? 'Excellent' : s >= 75 ? 'Good' : s >= 60 ? 'Average' : 'Poor',
  };
}

const FAKE_TRANSCRIPT: TranscriptLine[] = [
  { time: '0:04', speaker: 'client', txt: "Mrhba, 3andi mochkila m3a l-factoura dyali dyal had chhar..." },
  { time: '0:09', speaker: 'agent', txt: "Ahlan wa sahlan, ana ghadi n3awnek. Wash momken t3tini raqm l-compte dyalk?" },
  { time: '0:17', speaker: 'client', txt: "Yeh, huwa 7734-B. Kayen charge zdada ma fahemtch." },
  { time: '0:31', speaker: 'agent', txt: "Fhemt, ghadi nchouf l-compte dyalk daba. Iyeh, kayna mochkila f migration dyal l-forfait. Ghadi nsifet credit d 45 dirham." },
  { time: '0:52', speaker: 'client', txt: "Choukran bzzaf, had service mzyan." },
  { time: '0:58', speaker: 'agent', txt: "La shokr 3la wajib. Had l-credit ghadi yban f compte f 24 sa3a. Ma3a salama." },
];

// ── COMPONENT ───────────────────────────────────────────────────────────────
export default function App() {
  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Navigation
  const [view, setView] = useState<View>('dashboard');
  const [currentWS, setCurrentWS] = useState<Workspace | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);

  // Calls data (workspace_id → Call[])
  const [calls, setCalls] = useState(INITIAL_CALLS);

  // Results phase
  const [resultsPhase, setResultsPhase] = useState<'processing' | 'done'>('done');
  const [activeStep, setActiveStep] = useState(0);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);

  // Processing
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Upload modal
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', agent: '', date: '', client: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        // Advance visual step from backend status
        const backendStep = STEP_MAP[data.step] ?? activeStep;
        setActiveStep(prev => Math.max(prev, backendStep));

        if (data.status === 'completed') {
          clearInterval(interval);
          if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
          setActiveStep(4);

          // Fetch transcript
          let lines: TranscriptLine[] = [];
          if (data.base_name) {
            try {
              const docxRes = await fetch(`/api/content/${data.base_name}_falcon.docx`);
              if (docxRes.ok) {
                const docxData = await docxRes.json();
                lines = parseTranscript(docxData.content || '');
              }
            } catch (_) {}
          }
          setTranscriptLines(lines.length ? lines : FAKE_TRANSCRIPT);

          const assessment = data.assessment_data || {};
          setAssessmentResult(assessment);

          // Update the call in the workspace list with real data
          if (currentWS && currentCall) {
            const score = assessment?.agent_performance?.overall_score ?? null;
            setCalls(prev => ({
              ...prev,
              [currentWS.id]: prev[currentWS.id].map(c =>
                c.id === currentCall.id
                  ? { ...c, status: 'done', score, assessmentData: assessment }
                  : c
              ),
            }));
          }

          setTimeout(() => setResultsPhase('done'), 300);
        }

        if (data.status === 'failed') {
          clearInterval(interval);
          showToast('Analysis failed. Please try again.');
        }
      } catch (_) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [activeTaskId, resultsPhase]);

  // ── PROCESSING ANIMATION ─────────────────────────────────────────────────
  const startStepAnimation = () => {
    let i = 0;
    const advance = () => {
      if (i < PROCESSING_STEPS.length - 1) {
        setActiveStep(i);
        i++;
        stepTimerRef.current = setTimeout(advance, 900 + Math.random() * 400);
      }
    };
    advance();
  };

  // ── AUTH ─────────────────────────────────────────────────────────────────
  const doLogin = () => {
    if (CREDS[loginEmail] === loginPass) {
      setLoginError(false);
      setCurrentUser(loginEmail);
      setIsLoggedIn(true);
    } else {
      setLoginError(true);
    }
  };

  const doLogout = () => {
    setIsLoggedIn(false);
    setLoginPass('');
    setLoginError(false);
  };

  // ── NAVIGATION ───────────────────────────────────────────────────────────
  const navTo = (v: View) => setView(v);

  const openWorkspace = (ws: Workspace) => {
    setCurrentWS(ws);
    setView('calls');
  };

  const openCall = (call: Call) => {
    if (call.status === 'proc') { showToast('Still processing…'); return; }
    setCurrentCall(call);
    setAssessmentResult(call.assessmentData || fakeAssessment(call));
    setTranscriptLines(call.transcriptText ? parseTranscript(call.transcriptText) : FAKE_TRANSCRIPT);
    setResultsPhase('done');
    setView('results');
  };

  const backFromResults = () => {
    setView('calls');
    setActiveTaskId(null);
  };

  // ── UPLOAD ───────────────────────────────────────────────────────────────
  const openModal = () => {
    setUploadFile(null);
    setUploadForm({ name: '', agent: '', date: '', client: '' });
    setModalOpen(true);
  };

  const isModalReady = !!uploadFile && !!uploadForm.name.trim() && !!uploadForm.agent.trim() && !!uploadForm.date;

  const startAnalysis = async () => {
    if (!uploadFile || !isModalReady || !currentWS) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { filename } = await uploadRes.json();

      const skipTranscription = uploadFile.name.endsWith('.docx');
      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          project_id: `WS-${currentWS.id}`,
          project_name: currentWS.name,
          agent_name: uploadForm.agent,
          skip_transcription: skipTranscription,
        }),
      });
      if (!processRes.ok) throw new Error('Process failed');
      const { task_id } = await processRes.json();

      // Add call to workspace list as "proc"
      const newCall: Call = {
        id: Date.now(),
        name: uploadForm.name,
        agent: uploadForm.agent,
        date: uploadForm.date,
        client: uploadForm.client || '—',
        duration: '—',
        status: 'proc',
        score: null,
        taskId: task_id,
      };
      setCalls(prev => ({
        ...prev,
        [currentWS.id]: [newCall, ...(prev[currentWS.id] || [])],
      }));

      setCurrentCall(newCall);
      setActiveTaskId(task_id);
      setResultsPhase('processing');
      setActiveStep(0);
      setModalOpen(false);
      setView('results');
      startStepAnimation();
    } catch {
      showToast('Failed to start analysis.');
    } finally {
      setIsUploading(false);
    }
  };

  // ── BREADCRUMB ───────────────────────────────────────────────────────────
  const trailEl = () => {
    if (view === 'calls' && currentWS) return (
      <div className="topbar-trail">
        <span>Workspaces</span><span className="sep">/</span><span>{currentWS.name}</span>
      </div>
    );
    if (view === 'results' && currentCall && currentWS) return (
      <div className="topbar-trail">
        <span>{currentWS.name}</span><span className="sep">/</span><span>{currentCall.name}</span>
      </div>
    );
    const labels: Record<string, string> = { dashboard: 'Dashboard', workspaces: 'Workspaces', agents: 'Agents', settings: 'Settings' };
    return <div className="topbar-trail"><span>{labels[view] || view}</span></div>;
  };

  // ── RENDER: ASSESSMENT BLOCKS ─────────────────────────────────────────────
  const renderResults = (data: any, lines: TranscriptLine[]) => {
    const perf = data?.agent_performance || {};
    const quant = data?.quantitative || {};
    const qual: any[] = data?.qualitative_observations || [];

    const quantItems = [
      { val: quant.talk_time || '—', label: 'Talk time', c: '' },
      { val: quant.resolution_rate || '—', label: 'Resolution rate', c: 'teal' },
      { val: String(quant.transfers ?? '—'), label: 'Transfers', c: '' },
      { val: quant.avg_hold_time || '—', label: 'Avg hold time', c: '' },
      { val: quant.csat_score || '—', label: 'CSAT score', c: 'teal' },
      { val: String(quant.escalations ?? '—'), label: 'Escalations', c: 'teal' },
    ];

    const perfItems = [
      { label: 'Communication', key: 'communication' },
      { label: 'Problem Resolution', key: 'problem_resolution' },
      { label: 'Empathy', key: 'empathy' },
      { label: 'Script Adherence', key: 'script_adherence' },
      { label: 'Response Time', key: 'response_time' },
      { label: 'Overall Score', key: 'overall_score' },
    ];

    return (
      <>
        {/* Quantitative */}
        <div className="res-block">
          <div className="res-block-hd"><h3>Quantitative Info</h3></div>
          <div className="res-block-body">
            <div className="quant-grid">
              {quantItems.map((q, i) => (
                <div key={i} className="qc">
                  <div className={`qc-val ${q.c}`}>{q.val}</div>
                  <div className="qc-label">{q.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Qualitative */}
        <div className="res-block">
          <div className="res-block-hd"><h3>Qualitative Info</h3></div>
          <div className="res-block-body">
            <div className="qual-list">
              {qual.map((q, i) => (
                <div key={i} className="qual-item">
                  <span className={`qual-tag ${q.tag === 'positive' ? 'pos' : q.tag === 'negative' ? 'neg' : 'neu'}`}>
                    {q.tag}
                  </span>
                  <div className="qual-text">{q.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="res-block">
          <div className="res-block-hd"><h3>Transcript</h3></div>
          <div className="res-block-body">
            <div className="tr-block">
              {lines.map((l, i) => (
                <div key={i} className="tr-line">
                  <span className={`tr-sp ${l.speaker}`}>{l.speaker}</span>
                  <span className="tr-txt">{l.txt}</span>
                  <span className="tr-time">{l.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Assessment */}
        <div className="res-block">
          <div className="res-block-hd"><h3>Agent Assessment</h3></div>
          <div className="res-block-body">
            <div className="assess-grid">
              {perfItems.map((item) => {
                const val = perf[item.key] ?? 0;
                const c = scoreColor(val);
                return (
                  <div key={item.key} className="ag">
                    <div className="ag-label">{item.label}</div>
                    <div className="ag-bar">
                      <div className={`ag-fill ${c}`} style={{ width: `${val}%` }} />
                    </div>
                    <div className="ag-score">{val}<span>/100</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ── RENDER: RECENT CALLS FOR DASHBOARD ────────────────────────────────────
  const recentCalls = [
    { name: 'Customer Onboarding #1042', date: '2026-03-18', agent: 'Youssef El Fassi', workspace: 'Enterprise Onboarding', duration: '12:34', status: 'done', score: 92 },
    { name: 'Technical Support — Server', date: '2026-03-17', agent: 'Fatima Zahra', workspace: 'Tech Support Q1', duration: '08:21', status: 'done', score: 87 },
    { name: 'Sales Discovery — Acme Corp', date: '2026-03-17', agent: 'Mehdi Benmoussa', workspace: 'Sales Pipeline', duration: '22:15', status: 'done', score: 95 },
    { name: 'Billing Inquiry Resolution', date: '2026-03-19', agent: 'Sara Alami', workspace: 'Customer Retention', duration: '06:48', status: 'proc', score: null },
  ];

  // ── JSX ──────────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div id="pg-login">
        <div className="login-top">
          <div className="eyebrow">◆ Enterprise Platform</div>
          <h1>Falcon <b>Call</b> AI</h1>
          <p>Moroccan Darija · Transcription &amp; Analysis</p>
        </div>
        <div className="login-box">
          <label className="lbl">Email</label>
          <input
            className={`inp ${loginError ? 'err' : ''}`}
            type="text"
            placeholder="you@falconcall.ma"
            value={loginEmail}
            onChange={e => { setLoginEmail(e.target.value); setLoginError(false); }}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
          />
          <label className="lbl">Password</label>
          <input
            className={`inp ${loginError ? 'err' : ''}`}
            type="password"
            placeholder="••••••••"
            value={loginPass}
            onChange={e => { setLoginPass(e.target.value); setLoginError(false); }}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
          />
          {loginError && <div className="err-txt">Incorrect email or password.</div>}
          <button className="btn-cta" onClick={doLogin}>Sign in →</button>
          <div className="login-hint">Demo &nbsp;admin@falcon.ma &nbsp;/&nbsp; falcon2024</div>
        </div>
      </div>
    );
  }

  return (
    <div id="app">
      {/* ── SIDEBAR ── */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">F</div>
          <div className="brand-name">Falcon <span>AI</span></div>
        </div>
        <nav className="nav">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> },
            { id: 'workspaces', label: 'Workspaces', icon: <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1 4h14M1 4v9a1 1 0 001 1h12a1 1 0 001-1V4M1 4l2-3h10l2 3"/></svg> },
            { id: 'agents', label: 'Agents', icon: <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2.5-5 5-5s5 2 5 5"/><circle cx="12" cy="5" r="2"/><path d="M14 14c0-2-1-3.5-2-4"/></svg> },
            { id: 'settings', label: 'Settings', icon: <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/></svg> },
          ].map(item => (
            <div
              key={item.id}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => navTo(item.id as View)}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-avatar">{currentUser[0]?.toUpperCase()}</div>
            <div className="user-email">{currentUser}</div>
          </div>
          <button className="btn-signout" onClick={doLogout}>← Sign out</button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="main">
        <div className="topbar">{trailEl()}</div>

        {/* Dashboard */}
        {view === 'dashboard' && (
          <div className="page fade">
            <div className="page-hd"><h2>Dashboard</h2><p>Overview of your call intelligence platform.</p></div>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-card-label">Total Calls</div><div className="stat-card-val teal">1,274</div><div className="stat-delta up">↑ +12.5% vs last month</div></div>
              <div className="stat-card"><div className="stat-card-label">Active Agents</div><div className="stat-card-val">6</div><div className="stat-delta up">↑ +2 vs last month</div></div>
              <div className="stat-card"><div className="stat-card-label">Avg Score</div><div className="stat-card-val amber">89.8</div><div className="stat-delta up">↑ +3.2% vs last month</div></div>
              <div className="stat-card"><div className="stat-card-label">Workspaces</div><div className="stat-card-val">4</div><div className="stat-delta">— 0 vs last month</div></div>
            </div>
            <div className="section-title">Recent Calls</div>
            <div className="recent-table">
              <div className="rt-head"><div>Call</div><div>Agent</div><div>Workspace</div><div>Duration</div><div>Status</div><div>Score</div></div>
              {recentCalls.map((c, i) => (
                <div key={i} className="rt-row">
                  <div><div className="rt-name">{c.name}</div><div className="rt-sub">{c.date}</div></div>
                  <div className="rt-sub">{c.agent}</div>
                  <div className="rt-sub">{c.workspace}</div>
                  <div className="rt-sub">{c.duration}</div>
                  <div><span className={`badge ${c.status}`}><span className="badge-dot"/>{c.status === 'done' ? 'completed' : 'processing'}</span></div>
                  <div className="score-val">{c.score ?? <span style={{ color: 'var(--muted)' }}>—</span>}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workspaces */}
        {view === 'workspaces' && (
          <div className="page fade">
            <div className="page-hd"><h2>Workspaces</h2><p>Organize and track call analysis by workspace.</p></div>
            <div className="ws-grid">
              {WORKSPACES.map(ws => (
                <div key={ws.id} className="ws-card" onClick={() => openWorkspace(ws)}>
                  <div className="ws-active">active</div>
                  <div className="ws-card-name">{ws.name}</div>
                  <div className="ws-card-desc">{ws.desc}</div>
                  <div className="ws-card-meta">
                    <div className="ws-meta-item">👥 {ws.agents} agents</div>
                    <div className="ws-meta-item">📞 {(calls[ws.id] || []).length} calls</div>
                    <div className="ws-meta-item">↑ Avg {ws.avgScore}</div>
                  </div>
                </div>
              ))}
              <div className="btn-new-ws" onClick={() => showToast('Create workspace — coming soon')}>+ New Workspace</div>
            </div>
          </div>
        )}

        {/* Calls */}
        {view === 'calls' && currentWS && (
          <div className="page fade">
            <div className="back-btn" onClick={() => navTo('workspaces')}>← Workspaces</div>
            <div className="calls-hd">
              <div>
                <div style={{ fontFamily: 'var(--fh)', fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>{currentWS.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>{currentWS.desc}</div>
              </div>
              <button className="btn-add-call" onClick={openModal}>+ Add Call</button>
            </div>
            <div className="calls-list">
              {(calls[currentWS.id] || []).map(c => (
                <div key={c.id} className="call-row" onClick={() => openCall(c)}>
                  <div className="call-row-left">
                    <div className="call-row-name">{c.name}</div>
                    <div className="call-row-meta">
                      <span>{c.agent}</span>
                      <span>·</span>
                      <span>{c.date}</span>
                      <span>·</span>
                      <span>{c.client}</span>
                      <span>·</span>
                      <span>{c.duration}</span>
                    </div>
                  </div>
                  <div className="call-row-right">
                    <span className={`badge ${c.status}`}><span className="badge-dot"/>{c.status === 'done' ? 'completed' : 'processing'}</span>
                    <div className="call-score">{c.score !== null ? c.score : <span style={{ color: 'var(--muted)' }}>—</span>}</div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--muted)" strokeWidth="1.5"><path d="M6 3l5 5-5 5"/></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {view === 'results' && (
          <div className="results-view">
            <div className="results-view-back">
              <div className="back-btn" onClick={backFromResults}>← Back to calls</div>
            </div>

            {resultsPhase === 'processing' && (
              <div id="pg-processing">
                <div className="proc-ring" />
                <div className="proc-title">Analyzing call…</div>
                <div className="proc-steps">
                  {PROCESSING_STEPS.map((step, i) => (
                    <div
                      key={i}
                      className={`pstep ${i === activeStep ? 'active' : i < activeStep ? 'done' : ''}`}
                    >
                      <span className="pstep-dot" />{step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultsPhase === 'done' && assessmentResult && currentCall && (
              <div id="pg-results">
                <div className="res-hero">
                  <div>
                    <div className="res-title">{currentCall.name}</div>
                    <div className="res-meta">{currentCall.agent} · {currentCall.date} · {currentCall.client}</div>
                  </div>
                  <div className="badge-complete">✓ Complete</div>
                </div>

                <div className="info-strip">
                  <div className="ic"><div className="ic-label">Duration</div><div className="ic-val teal">{currentCall.duration}</div></div>
                  <div className="ic"><div className="ic-label">File size</div><div className="ic-val">—</div></div>
                  <div className="ic"><div className="ic-label">Verdict</div><div className="ic-val amber">{assessmentResult.final_verdict || '—'}</div></div>
                  <div className="ic"><div className="ic-label">Language</div><div className="ic-val" style={{ fontSize: '14px' }}>Darija / AR</div></div>
                </div>

                <div className="res-block">
                  <div className="res-block-hd"><h3>Call Summary</h3></div>
                  <div className="res-block-body"><div className="summary-text">{assessmentResult.call_summary}</div></div>
                </div>

                {renderResults(assessmentResult, transcriptLines)}
              </div>
            )}
          </div>
        )}

        {/* Agents */}
        {view === 'agents' && (
          <div className="page fade">
            <div className="page-hd"><h2>Agents</h2><p>Monitor and compare agent performance across all workspaces.</p></div>
            <div className="agents-grid">
              {AGENTS.map(a => (
                <div key={a.name} className="agent-card">
                  <div className={`agent-trend ${a.trend === 'up' ? 'up' : a.trend === 'dn' ? 'dn' : ''}`}>
                    {a.trend === 'up' ? '↑' : a.trend === 'dn' ? '↓' : '—'}
                  </div>
                  <div className="agent-av">{a.name.split(' ').map(n => n[0]).join('')}</div>
                  <div className="agent-name">{a.name}</div>
                  <div className="agent-role">{a.role}</div>
                  <div className="agent-score">{a.score}<span>/100</span></div>
                  <div className="agent-meta">
                    <span>📞 {a.calls} calls</span>
                    <span>⏱ {a.avg} avg</span>
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
                <div className="sf"><label>Gemini API Key</label><input type="password" defaultValue="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" /></div>
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
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.docx"
              onChange={e => setUploadFile(e.target.files?.[0] || null)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            />
            <div className="drop-icon">⬆</div>
            <div className="drop-label">Drop file or click to browse</div>
            <div className="drop-hint">.mp3 &nbsp;.wav &nbsp;.m4a &nbsp;.docx</div>
            {uploadFile && <div className="drop-file">📎 {uploadFile.name}</div>}
          </div>

          <div className="modal-grid">
            <div className="mf">
              <label>Call Name *</label>
              <input placeholder="Onboarding #1042" value={uploadForm.name} onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="mf">
              <label>Agent Name *</label>
              <input placeholder="Youssef El Fassi" value={uploadForm.agent} onChange={e => setUploadForm(p => ({ ...p, agent: e.target.value }))} />
            </div>
            <div className="mf">
              <label>Call Date *</label>
              <input type="date" value={uploadForm.date} onChange={e => setUploadForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="mf">
              <label>Client</label>
              <input placeholder="Maroc Telecom" value={uploadForm.client} onChange={e => setUploadForm(p => ({ ...p, client: e.target.value }))} />
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-analyze" disabled={!isModalReady || isUploading} onClick={startAnalysis}>
              {isUploading ? 'Uploading…' : 'Analyze →'}
            </button>
          </div>
        </div>
      </div>

      {/* ── TOAST ── */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
