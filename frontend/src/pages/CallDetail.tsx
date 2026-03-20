import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Info, BarChart3, MessageSquare, UserCheck, FileText, Tag, Loader2, Download } from "lucide-react";
import { calls, callDetail as mockCallDetail } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-end gap-6 sticky top-0 z-20 bg-background/90 backdrop-blur-xl py-6 border-b border-border/40 mb-6">
        <div className="flex items-center gap-4 flex-1">
          <Button asChild variant="ghost" size="icon" className="shrink-0 hover:bg-accent/10">
            <Link to="/dashboard/workspaces"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight mb-1 truncate">{taskStatus.filename}</h1>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{a.final_verdict || "Pending"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
              <div className="flex items-center gap-1.5 bg-secondary/20 px-2 py-0.5 rounded-full">
                <span className="text-[10px] opacity-60">Duration:</span>
                <span className="text-foreground">{formatDuration(taskStatus.duration as number)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 shrink-0 bg-accent/5 p-4 rounded-3xl border border-accent/10">
          <div className="text-right">
            <div className="text-sm font-bold text-muted-foreground leading-none mb-1">QUALITY SCORE</div>
            <div className="text-4xl font-black gradient-text tracking-tighter leading-none">{overallScore}</div>
          </div>
          <div className="w-px h-10 bg-border/40" />
          {baseName && (
            <div className="flex flex-col gap-2">
              <a href={`/api/download/${baseName}_falcon.xlsx`} download>
                <Button variant="outline" size="sm" className="h-7 text-[10px] px-3 font-bold uppercase tracking-wider">
                  <Download className="w-3 h-3 mr-1.5" /> Excel
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Project Assessment Section */}
      {(a.project_summary || a.project_data) && (
        <section className="glass-card shadow-xl border-accent/20 overflow-hidden">
          <div className="p-6 border-b border-border/20 bg-accent/5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-2 text-accent">
                  <BarChart3 className="w-5 h-5" />
                  <h2 className="text-lg font-black uppercase tracking-widest">Project Insights</h2>
                </div>
                {a.project_summary && (
                  <p className="text-sm text-muted-foreground leading-relaxed italic font-medium">"{a.project_summary}"</p>
                )}
              </div>
              
              <div className="flex items-center gap-4 shrink-0">
                {a.project_data?.notation?.category && (
                  <div className="flex items-center gap-3 bg-accent/10 p-3 rounded-2xl border border-accent/20">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-0.5">Project Class</p>
                      <p className="text-xs font-bold text-accent-foreground">{a.project_data.notation.category_interpretation}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl font-black text-accent-foreground shadow-lg shadow-accent/20">
                      {a.project_data.notation.category}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Quantitative Potential Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* IDEA */}
              {a.project_data?.notation?.idea && (
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Idea Potential</h4>
                    <span className="text-xs font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">{a.project_data.notation.idea.idea_potential?.toFixed(1)}/5</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Clarity", value: a.project_data.notation.idea.criteria?.clarity_of_problem },
                      { label: "Problem-Fit", value: a.project_data.notation.idea.criteria?.solution_problem_fit },
                      { label: "Desirability", value: a.project_data.notation.idea.criteria?.desirability },
                      { label: "Feasibility", value: a.project_data.notation.idea.criteria?.feasibility },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-muted-foreground">
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
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-500">Team Potential</h4>
                    <span className="text-xs font-black text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">{a.project_data.notation.team.team_potential?.toFixed(1)}/5</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Skills", value: a.project_data.notation.team.criteria?.team_complementarity },
                      { label: "Leadership", value: a.project_data.notation.team.criteria?.founder_potential },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-muted-foreground">
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
                <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500">Pilot Readiness</h4>
                    <span className="text-xs font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">{a.project_data.notation.pilot.pilot_potential?.toFixed(1)}/5</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Investment", value: a.project_data.notation.pilot.criteria?.investment_for_pilot_score },
                      { label: "Speed", value: a.project_data.notation.pilot.criteria?.speed_of_pilot_score },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-muted-foreground">
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

            {/* Qualitative Strategic Context */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { label: "Maturity", value: a.project_data?.qualitative?.solution_evaluation?.situation_stage, icon: "🎯" },
                { label: "Status", value: a.project_data?.qualitative?.overall_situation?.situation_status, icon: "⚡" },
                { label: "Validation", value: a.project_data?.qualitative?.problem_validation?.problem_validated, icon: "✅" },
                { label: "Commercial", value: a.project_data?.qualitative?.solution_evaluation?.commercial_potential_outside_ocp_morocco, icon: "🌐" },
                { label: "Consulted", value: a.project_data?.qualitative?.solution_evaluation?.customers_consulted, icon: "👥" },
                { label: "Strategic Fit", value: a.project_data?.qualitative?.strategic_fit?.strategic_fit_ocp, icon: "💎" },
                { label: "Support Path", value: a.project_data?.qualitative?.overall_situation?.support_path, icon: "🚀" },
                { label: "MVP Budget", value: a.project_data?.qualitative?.solution_evaluation?.mvp_budget, icon: "💰" },
                { label: "Lead Time", value: a.project_data?.qualitative?.solution_evaluation?.mvp_duration, icon: "📅" },
                { label: "Mobility", value: a.project_data?.qualitative?.team_and_skills?.team_status, icon: "🏃" },
                { label: "Key Skills", value: a.project_data?.qualitative?.team_and_skills?.team_has_key_skills, icon: "🔧" },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-secondary/10 border border-border/40">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">{item.icon} {item.label}</p>
                  <p className="text-xs font-bold truncate">{item.value || "—"}</p>
                </div>
              ))}
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
          <div className="p-6 border-b border-border/20 bg-primary/5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-2 text-primary">
                  <UserCheck className="w-5 h-5" />
                  <h2 className="text-lg font-black uppercase tracking-widest">Agent Assessment</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic font-medium">"{a.agent_summary}"</p>
              </div>
              
              <div className="flex items-center gap-4 shrink-0">
                <div className="grid grid-cols-2 gap-3 bg-primary/10 p-4 rounded-2xl border border-primary/20 text-center min-w-[200px]">
                  <div>
                    <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-0.5">Sentiment</p>
                    <p className="text-xs font-bold text-primary">{a.behavioral_analysis?.sentiment || "Neutral"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-0.5">Verdict</p>
                    <p className="text-xs font-bold text-primary">{a.final_verdict || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Competency Scores */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Competency Report</h3>
                <div className="grid grid-cols-1 gap-4">
                  {quantMetrics.map(([key, value]) => {
                    const pct = scoreToPercent(value as string | number);
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                          <span>{key.replace(/_/g, " ")}</span>
                          <span className="text-primary">{pct}/100</span>
                        </div>
                        <Progress value={pct} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observations */}
              <div className="space-y-6">
                {positiveObs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-black text-success uppercase tracking-widest">Strong Points</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {positiveObs.map((s, i) => <Badge key={i} className="bg-success/5 text-success hover:bg-success/10 border-success/20 text-[10px] py-0">{s}</Badge>)}
                    </div>
                  </div>
                )}
                {negativeObs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[9px] font-black text-warning uppercase tracking-widest">Areas for Growth</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {negativeObs.map((s, i) => <Badge key={i} className="bg-warning/5 text-warning hover:bg-warning/10 border-warning/20 text-[10px] py-0">{s}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Transcript Section */}
      {transcriptLines.length > 0 && (
        <section className="glass-card shadow-xl border-blue-500/20 overflow-hidden">
          <div className="p-6 border-b border-border/20 bg-blue-500/5">
            <div className="flex items-center gap-2 text-blue-500">
              <MessageSquare className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-widest">Interaction Record</h2>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-blue-500/10 scrollbar-track-transparent">
              {transcriptLines.map((line, i) => {
                const isAgent = line.speaker.toLowerCase().includes('agent') || line.speaker.toLowerCase().includes('a');
                return (
                  <div key={i} className="flex gap-4 group">
                    <div className="shrink-0 w-12 text-right pt-2 opacity-30 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-mono font-black">{line.time}</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className={`text-[9px] font-black uppercase tracking-tight ${isAgent ? "text-primary" : "text-accent"}`}>
                        {line.speaker}
                      </div>
                      <div className={`p-3 rounded-2xl rounded-tl-none border transition-all ${isAgent ? "bg-primary/5 border-primary/10" : "bg-secondary/5 border-border/40"}`}>
                        <p className="text-xs text-foreground/80 leading-relaxed font-medium">{line.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
    </div>
  );
};

// ── Mock Call Detail Component ─────────────────────────────────────

type MockDetail = typeof mockCallDetail & { title: string; agent: string; date: string; score: number };

const MockCallDetail = ({ d }: { d: MockDetail }) => (
  <div className="max-w-4xl mx-auto space-y-6 pb-20">
    <div className="flex flex-col md:flex-row md:items-end gap-6 sticky top-0 z-20 bg-background/90 backdrop-blur-xl py-6 border-b border-border/40 mb-6">
      <div className="flex items-center gap-4 flex-1">
        <Button asChild variant="ghost" size="icon" className="shrink-0 hover:bg-primary/10">
          <Link to="/dashboard/workspaces/w1"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight mb-1 truncate">{d.title}</h1>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">Mock Analysis</span>
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            <div className="flex items-center gap-1.5 bg-secondary/20 px-2 py-0.5 rounded-full">
              <span className="text-[10px] opacity-60">Duration:</span>
              <span className="text-foreground">{d.duration}</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            <span>{d.agent} · {d.date}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6 shrink-0 bg-primary/5 p-4 rounded-3xl border border-primary/10">
        <div className="text-right">
          <div className="text-sm font-bold text-muted-foreground leading-none mb-1">QUALITY SCORE</div>
          <div className="text-4xl font-black gradient-text tracking-tighter leading-none">{d.score}</div>
        </div>
      </div>
    </div>

    <section className="glass-card shadow-lg border-primary/10 overflow-hidden">
      <div className="p-6 border-b border-border/20 bg-primary/5">
        <div className="flex items-center gap-2 text-primary">
          <FileText className="w-5 h-5" />
          <h2 className="text-sm font-black uppercase tracking-widest">Executive Summary</h2>
        </div>
      </div>
      <div className="p-6">
        <p className="text-sm text-muted-foreground leading-relaxed font-medium italic">"{d.summary}"</p>
      </div>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section className="glass-card shadow-lg border-accent/10 overflow-hidden">
        <div className="p-6 border-b border-border/20 bg-accent/5">
          <div className="flex items-center gap-2 text-accent">
            <BarChart3 className="w-5 h-5" />
            <h2 className="text-sm font-black uppercase tracking-widest">Performance Metrics</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {Object.entries(d.quantitative).map(([key, value]) => (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                <span className="capitalize">{key}</span>
                <span className="text-accent">{value}%</span>
              </div>
              <Progress value={value} className="h-1 bg-accent/10" />
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card shadow-lg border-purple-500/10 overflow-hidden">
        <div className="p-6 border-b border-border/20 bg-purple-500/5">
          <div className="flex items-center gap-2 text-purple-500">
            <Tag className="w-5 h-5" />
            <h2 className="text-sm font-black uppercase tracking-widest">Behavioral Analysis</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
              <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-0.5">Sentiment</p>
              <p className="text-xs font-bold">{d.qualitative.sentiment}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
              <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-0.5">Tone</p>
              <p className="text-xs font-bold">{d.qualitative.tone}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {d.qualitative.keywords.map((k) => (
                <Badge key={k} variant="secondary" className="bg-purple-500/5 text-purple-500 border-purple-500/10 text-[10px] py-0">{k}</Badge>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>

    <section className="glass-card shadow-lg border-blue-500/10 overflow-hidden">
      <div className="p-6 border-b border-border/20 bg-blue-500/5">
        <div className="flex items-center gap-2 text-blue-500">
          <MessageSquare className="w-5 h-5" />
          <h2 className="text-sm font-black uppercase tracking-widest">Interaction Transcript</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-blue-500/10 scrollbar-track-transparent">
          {d.transcript.map((line, i) => (
            <div key={i} className="flex gap-4 group">
              <div className="shrink-0 w-12 text-right pt-2 opacity-30 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-mono font-black">{line.time}</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className={`text-[9px] font-black uppercase tracking-tight ${line.speaker === "Agent" ? "text-primary" : "text-accent"}`}>
                  {line.speaker.toUpperCase()}
                </div>
                <div className={`p-3 rounded-2xl rounded-tl-none border transition-all ${line.speaker === "Agent" ? "bg-primary/5 border-primary/10" : "bg-secondary/5 border-border/40"}`}>
                  <p className="text-xs text-foreground/80 leading-relaxed font-medium">{line.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="glass-card shadow-lg border-success/10 overflow-hidden">
      <div className="p-6 border-b border-border/20 bg-success/5">
        <div className="flex items-center gap-2 text-success">
          <UserCheck className="w-5 h-5" />
          <h2 className="text-sm font-black uppercase tracking-widest">Coaching & Feedback</h2>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-success uppercase tracking-widest">Strengths</h3>
          <ul className="space-y-2">
            {d.agentAssessment.strengths.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2 font-medium">
                <span className="text-success">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-warning uppercase tracking-widest">Growth Areas</h3>
          <ul className="space-y-2">
            {d.agentAssessment.improvements.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2 font-medium">
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
