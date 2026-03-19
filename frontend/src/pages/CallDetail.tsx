import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Info, BarChart3, MessageSquare, UserCheck, FileText, Tag, Loader2, Download } from "lucide-react";
import { calls, callDetail as mockCallDetail } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

// Types for backend assessment data
interface BackendAssessment {
  agent_summary?: string;
  project_summary?: string;
  project_data?: {
    notation?: any;
    qualitative?: any;
  };
  quantitative?: Record<string, string | number>;
  qualitative_observations?: Array<{ tag: string; text: string }>;
  agent_performance?: Record<string, number>;
  behavioral_analysis?: {
    sentiment: string;
    tone: string;
    keywords: string[];
  };
  final_verdict?: string;
  transcript?: string;
  dialogue?: Array<{ time: string; speaker: string; text: string }>;
}

interface TaskStatus {
  status: "pending" | "processing" | "completed" | "failed";
  step?: string;
  assessment_data?: BackendAssessment;
  base_name?: string;
  filename?: string;
  duration?: number;
  cost_usd?: number;
  error?: string;
}

// Check if id is a numeric ID (backend call)
const isBackendId = (id: string | undefined): boolean => {
  if (!id) return false;
  return /^\d+$/.test(id);
};

const scoreToPercent = (v: string | number): number => {
  if (typeof v === "number") return Math.min(100, Math.max(0, v));
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  if (String(v).includes("/10")) return n * 10;
  if (String(v).includes("%")) return n;
  return n;
};

const CallDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const isBackend = isBackendId(id);
  const mockCall = !isBackend ? calls.find((c) => c.id === Number(id)) : null;

  useEffect(() => {
    if (!isBackend) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/status/${id}`);
        if (!res.ok) return;
        const data: TaskStatus = await res.json();
        setTaskStatus(data);
        if (data.status === "completed" || data.status === "failed") {
          setPollInterval((prev) => {
            if (prev) clearInterval(prev);
            return null;
          });
        }
      } catch {}
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    setPollInterval(interval);
    return () => clearInterval(interval);
  }, [id, isBackend]);

  // ── MOCK CALL DETAIL ──────────────────────────────────────────────
  if (!isBackend) {
    const d = mockCall ? { ...mockCallDetail, ...mockCall, title: mockCall.title, agent: mockCall.agent, date: mockCall.date, score: mockCall.score } : mockCallDetail;
    return <MockCallDetail d={d} />;
  }

  // ── BACKEND CALL – LOADING / PROCESSING ──────────────────────────
  if (!taskStatus || taskStatus.status === "pending" || taskStatus.status === "processing") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard/workspaces"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Processing Call...</h1>
        </div>
        <div className="glass-card p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full gradient-bg-subtle flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div>
            <p className="text-lg font-semibold">{taskStatus?.step || "Starting..."}</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a few minutes</p>
          </div>
        </div>
      </div>
    );
  }

  // ── BACKEND CALL – FAILED ─────────────────────────────────────────
  if (taskStatus.status === "failed") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard/workspaces"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <h1 className="text-xl font-bold text-destructive">Processing Failed</h1>
        </div>
        <div className="glass-card p-8">
          <p className="text-muted-foreground">{taskStatus.error || "An unknown error occurred."}</p>
        </div>
      </div>
    );
  }

  // ── BACKEND CALL – COMPLETED ──────────────────────────────────────
  const formatDuration = (s?: number) => {
    if (s === undefined || s === null) return "—";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}m ${secs}s`;
  };

  const a = taskStatus.assessment_data || {};
  const baseName = taskStatus.base_name || "";

  const quantMetrics = a.agent_performance
    ? Object.entries(a.agent_performance).filter(([k]) => k !== "overall_score")
    : [];

  const positiveObs = (a.qualitative_observations || []).filter((o) => o?.tag === "positive").map((o) => o.text);
  const negativeObs = (a.qualitative_observations || []).filter((o) => o?.tag === "negative" || o?.tag === "neutral").map((o) => o.text);

  const overallScore = a.agent_performance?.overall_score ?? 0;
  
  const parseTranscript = (raw: string) =>
    raw
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        const m = line.match(/^\[?(\d+:\d+)\]?\s*(.+?):\s*(.+)/i);
        if (!m) return null;
        const [, time, speaker, text] = m;
        const cleanedText = text
          .replace(/\b(ah|uh|mhm|euh|ehm|umm|euhh|ahh|uhh)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        return { time, speaker: speaker.trim(), text: cleanedText };
      })
      .filter(Boolean) as Array<{ time: string; speaker: string; text: string }>;

  const transcriptLines = a.dialogue && a.dialogue.length > 0 
    ? a.dialogue 
    : (a.transcript ? parseTranscript(a.transcript) : []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-3 sticky top-0 z-20 bg-background/80 backdrop-blur-md py-4 border-b border-border/40">
        <Button asChild variant="ghost" size="icon">
          <Link to="/dashboard/workspaces"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-black tracking-tight mb-1">{taskStatus.filename}</h1>
          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider">{a.final_verdict || "Pending"}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{formatDuration(taskStatus.duration as number)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-3xl font-bold gradient-text">{overallScore}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Quality Score</div>
          </div>
          {baseName && (
            <a href={`/api/download/${baseName}_falcon.xlsx`} download>
              <Button variant="outline" size="sm">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Excel
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Project Assessment Section */}
      {(a.project_summary || a.project_data) && (
        <section className="glass-card shadow-2xl border-accent/30 overflow-hidden">
          <div className="p-8 border-b border-border/40 bg-accent/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-accent">
                  <BarChart3 className="w-5 h-5" />
                  <h2 className="text-xl font-bold tracking-tight">Project Assessment</h2>
                </div>
                {a.project_summary && (
                  <p className="text-muted-foreground leading-relaxed italic tracking-tight max-w-3xl">"{a.project_summary}"</p>
                )}
              </div>
              
              <div className="flex items-center gap-4 shrink-0">
                {a.project_data?.notation?.category && (
                  <div className="flex items-center gap-3 bg-accent/10 p-3 rounded-2xl border border-accent/20">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Project Class</p>
                      <p className="text-xs font-semibold text-accent-foreground truncate max-w-[150px]">{a.project_data.notation.category_interpretation}</p>
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center text-3xl font-black text-accent-foreground shadow-xl shadow-accent/30">
                      {a.project_data.notation.category}
                    </div>
                  </div>
                )}
                <a href={`/api/download/${baseName}_project.csv`} download>
                  <Button variant="outline" size="sm" className="h-10 text-[10px] px-3 bg-accent/5 hover:bg-accent/10 border-accent/20 uppercase font-bold tracking-widest">
                    <Download className="w-4 h-4 mr-2" /> Export Project CSV
                  </Button>
                </a>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-10">
            {/* Quantitative Potential Indicators */}
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent/80 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-accent/30"></span> Potential Indicators
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* IDEA */}
                {a.project_data?.notation?.idea && (
                  <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Idea</h4>
                      <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 border-blue-500/30 text-blue-400">
                        {a.project_data.notation.idea.idea_potential?.toFixed(1)}/5
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: "Clarity", value: a.project_data.notation.idea.criteria?.clarity_of_problem },
                        { label: "Problem-Fit", value: a.project_data.notation.idea.criteria?.solution_problem_fit },
                        { label: "Desirability", value: a.project_data.notation.idea.criteria?.desirability },
                        { label: "Feasibility", value: a.project_data.notation.idea.criteria?.feasibility },
                        { label: "Potential", value: a.project_data.notation.idea.criteria?.solution_potential },
                      ].map((item) => (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                            <span>{item.label}</span>
                            <span className="text-foreground">{item.value || 0}/5</span>
                          </div>
                          <Progress value={(item.value || 0) * 20} className="h-1 bg-blue-500/20" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* TEAM */}
                {a.project_data?.notation?.team && (
                  <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Team</h4>
                      <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 border-purple-500/30 text-purple-400">
                        {a.project_data.notation.team.team_potential?.toFixed(1)}/5
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: "Complementarity", value: a.project_data.notation.team.criteria?.team_complementarity },
                        { label: "Founders", value: a.project_data.notation.team.criteria?.founder_potential },
                      ].map((item) => (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                            <span>{item.label}</span>
                            <span className="text-foreground">{item.value || 0}/5</span>
                          </div>
                          <Progress value={(item.value || 0) * 20} className="h-1 bg-purple-500/20" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* PILOT */}
                {a.project_data?.notation?.pilot && (
                  <div className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Pilot</h4>
                      <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 border-orange-500/30 text-orange-400">
                        {a.project_data.notation.pilot.pilot_potential?.toFixed(1)}/5
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: "Investment", value: a.project_data.notation.pilot.criteria?.investment_for_pilot_score },
                        { label: "Speed", value: a.project_data.notation.pilot.criteria?.speed_of_pilot_score },
                      ].map((item) => (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                            <span>{item.label}</span>
                            <span className="text-foreground">{item.value || 0}/5</span>
                          </div>
                          <Progress value={(item.value || 0) * 20} className="h-1 bg-orange-500/20" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Qualitative Strategic Context */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-border"></span> Strategic & Operational
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Maturity", value: a.project_data?.qualitative?.solution_evaluation?.situation_stage, icon: "🎯" },
                    { label: "Status", value: a.project_data?.qualitative?.overall_situation?.situation_status, icon: "⚡" },
                    { label: "Validated", value: a.project_data?.qualitative?.problem_validation?.problem_validated, icon: "✅" },
                    { label: "Users Consulted", value: a.project_data?.qualitative?.solution_evaluation?.customers_consulted, icon: "👥" },
                    { label: "Strategic Fit", value: a.project_data?.qualitative?.strategic_fit?.strategic_fit_ocp, icon: "💎" },
                    { label: "Support Path", value: a.project_data?.qualitative?.overall_situation?.support_path, icon: "🚀" },
                  ].map((item) => (
                    <div key={item.label} className="p-4 rounded-xl bg-secondary/10 border border-border/40">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{item.icon} {item.label}</p>
                      <p className="text-sm font-bold">{item.value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-border"></span> Financials & Team
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">MVP Budget</p>
                      <p className="text-base font-black">{a.project_data?.qualitative?.solution_evaluation?.mvp_budget || "N/A"}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Lead Time</p>
                      <p className="text-base font-black">{a.project_data?.qualitative?.solution_evaluation?.mvp_duration || "N/A"}</p>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-secondary/20 border border-border/40">
                    <div className="flex justify-between items-center text-center">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Mobility</p>
                        <p className="text-sm font-bold">{a.project_data?.qualitative?.team_and_skills?.team_status || "—"}</p>
                      </div>
                      <div className="w-[1px] h-8 bg-border mx-4" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Key Skills</p>
                        <p className="text-sm font-bold">{a.project_data?.qualitative?.team_and_skills?.team_has_key_skills || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {a.project_data?.notation?.operational_reading && (
              <div className="p-6 rounded-2xl bg-accent opacity-95 text-white shadow-xl shadow-accent/30">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Info className="w-5 h-5 text-white" /></div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 text-white/80">Operational Reading</h4>
                    <p className="text-sm font-medium leading-relaxed italic">"{a.project_data.notation.operational_reading}"</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Agent Performance Analysis Section */}
      {a.agent_summary && (
        <section className="glass-card shadow-xl border-primary/20 overflow-hidden">
          <div className="p-8 border-b border-border/40 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <UserCheck className="w-5 h-5" />
                <h2 className="text-xl font-bold tracking-tight">Agent Performance Analysis</h2>
              </div>
              <a href={`/api/download/${baseName}_agent.csv`} download>
                <Button variant="outline" size="sm" className="h-10 text-[10px] px-3 bg-primary/5 hover:bg-primary/10 border-primary/20 uppercase font-bold tracking-widest">
                  <Download className="w-4 h-4 mr-2" /> Performance CSV
                </Button>
              </a>
            </div>
            <p className="text-muted-foreground mt-4 leading-relaxed font-medium italic">"{a.agent_summary}"</p>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Competency Scores */}
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-border"></span> Technical Competencies
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  {quantMetrics.map(([key, value]) => {
                    const pct = scoreToPercent(value as string | number);
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight text-muted-foreground">
                          <span>{key.replace(/_/g, " ")}</span>
                          <span className="text-primary">{pct}/100</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Behavioral & Sentiment */}
              <div className="space-y-8">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-border"></span> Soft Skills & Vibes
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                    <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Sentiment</p>
                    <p className="text-base font-black">{a.behavioral_analysis?.sentiment || "Neutral"}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 text-right">
                    <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Verdict</p>
                    <p className="text-base font-black">{a.final_verdict || "N/A"}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {positiveObs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-success uppercase tracking-widest">Key Strengths</h4>
                      <div className="flex flex-wrap gap-2">
                        {positiveObs.map((s, i) => <Badge key={i} className="bg-success/10 text-success hover:bg-success/20 border-success/20 py-1">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                  {negativeObs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-warning uppercase tracking-widest">Development Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {negativeObs.map((s, i) => <Badge key={i} className="bg-warning/10 text-warning hover:bg-warning/20 border-warning/20 py-1">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Transcript Section */}
      {transcriptLines.length > 0 && (
        <section className="glass-card shadow-xl border-blue-500/20 overflow-hidden">
          <div className="p-8 border-b border-border/40 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <MessageSquare className="w-5 h-5" />
                <h2 className="text-xl font-bold tracking-tight">Interaction Transcript</h2>
              </div>
              <a href={`/api/download/${baseName}_falcon.docx`} download>
                <Button variant="outline" size="sm" className="h-10 text-[10px] px-3 bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 uppercase font-bold tracking-widest">
                  <Download className="w-4 h-4 mr-2" /> Download Word
                </Button>
              </a>
            </div>
          </div>
          <div className="p-8">
            <div className="space-y-8 max-h-[600px] overflow-y-auto pr-6 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent">
              {transcriptLines.map((line, i) => {
                const isAgent = line.speaker.toLowerCase().includes('agent') || line.speaker.toLowerCase().includes('a');
                return (
                  <div key={i} className="flex gap-6 group">
                    <div className="shrink-0 w-16 text-right pt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-mono text-muted-foreground">{line.time}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className={`text-[10px] font-black uppercase tracking-tighter ${isAgent ? "text-primary" : "text-accent"}`}>
                        {line.speaker}
                      </div>
                      <div className={`p-4 rounded-3xl rounded-tl-none border transition-all ${isAgent ? "bg-primary/5 border-primary/10" : "bg-secondary/5 border-border/40"}`}>
                        <p className="text-sm text-foreground/90 leading-relaxed font-medium">{line.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Technical Metadata Section */}
      <section className="glass-card p-8 border-muted-foreground/10 opacity-70">
        <div className="flex items-center gap-2 mb-8 text-muted-foreground">
          <Info className="w-5 h-5" />
          <h2 className="text-sm font-bold uppercase tracking-widest">Infrastructure Logs</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 max-w-xs">
          {[
            { label: "Analysed Audio", value: formatDuration(taskStatus.duration as number) },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-2xl bg-secondary/5 border border-border/20 text-center">
              <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">{item.label}</div>
              <div className="text-sm font-bold">{item.value}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ── Mock Call Detail Component ─────────────────────────────────────

type MockDetail = typeof mockCallDetail & { title: string; agent: string; date: string; score: number };

const MockCallDetail = ({ d }: { d: MockDetail }) => (
  <div className="max-w-4xl mx-auto space-y-8 pb-20">
    <div className="flex items-center gap-3 sticky top-0 z-20 bg-background/80 backdrop-blur-md py-4 border-b border-border/40">
      <Button asChild variant="ghost" size="icon">
        <Link to="/dashboard/workspaces/w1"><ArrowLeft className="w-4 h-4" /></Link>
      </Button>
      <div className="flex-1">
        <h1 className="text-xl font-bold truncate">{d.title}</h1>
        <p className="text-sm text-muted-foreground">{d.agent} · {d.date}</p>
      </div>
      <div className="text-right">
        <div className="text-3xl font-bold gradient-text">{d.score}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Quality Score</div>
      </div>
    </div>

    <section className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4 text-primary">
        <FileText className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Executive Summary</h2>
      </div>
      <p className="text-muted-foreground leading-relaxed">{d.summary}</p>
    </section>

    <section className="glass-card p-6">
      <div className="flex items-center gap-2 mb-6 text-accent">
        <BarChart3 className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Performance Metrics</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {Object.entries(d.quantitative).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="capitalize text-muted-foreground">{key}</span>
              <span className="font-semibold">{value}%</span>
            </div>
            <Progress value={value} className="h-1.5" />
          </div>
        ))}
      </div>
    </section>

    <section className="glass-card p-6">
      <div className="flex items-center gap-2 mb-6 text-purple-400">
        <Tag className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Behavioral Analysis</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Sentiment Index</Label>
            <div className="text-lg font-medium mt-1">{d.qualitative.sentiment}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Communication Tone</Label>
            <div className="text-lg font-medium mt-1">{d.qualitative.tone}</div>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Key Topics & Keywords</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {d.qualitative.keywords.map((k) => (
              <Badge key={k} variant="secondary" className="bg-secondary/50">{k}</Badge>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="glass-card p-6">
      <div className="flex items-center gap-2 mb-6 text-blue-400">
        <MessageSquare className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Interaction Transcript</h2>
      </div>
      <div className="space-y-6">
        {d.transcript.map((line, i) => (
          <div key={i} className="flex gap-4">
            <div className="shrink-0 w-16 text-right pt-1">
              <span className="text-[10px] font-mono text-muted-foreground">{line.time}</span>
            </div>
            <div className="flex-1">
              <div className={`text-xs font-bold mb-1 ${line.speaker === "Agent" ? "text-primary" : "text-accent"}`}>
                {line.speaker.toUpperCase()}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{line.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="glass-card p-6">
      <div className="flex items-center gap-2 mb-6 text-success">
        <UserCheck className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Coaching & Feedback</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-success/80 uppercase tracking-wider">Key Strengths</h3>
          <ul className="space-y-2">
            {d.agentAssessment.strengths.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-success">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-warning/80 uppercase tracking-wider">Growth Opportunities</h3>
          <ul className="space-y-2">
            {d.agentAssessment.improvements.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-warning">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  </div>
);

export default CallDetail;
