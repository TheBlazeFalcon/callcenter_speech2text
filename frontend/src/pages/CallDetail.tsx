import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Info, BarChart3, MessageSquare, UserCheck, FileText, Tag, Loader2, Download } from "lucide-react";
import { calls, callDetail as mockCallDetail } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  duration?: string;
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
  const a = taskStatus.assessment_data || {};
  const baseName = taskStatus.base_name || "";

  const quantMetrics = a.agent_performance
    ? Object.entries(a.agent_performance).filter(([k]) => k !== "overall_score")
    : [];

  const positiveObs = (a.qualitative_observations || []).filter((o) => o.tag === "positive").map((o) => o.text);
  const negativeObs = (a.qualitative_observations || []).filter((o) => o.tag === "negative" || o.tag === "neutral").map((o) => o.text);

  const overallScore = a.agent_performance?.overall_score ?? 0;
  
  const parseTranscript = (raw: string) =>
    raw
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        const m = line.match(/^\[?(\d+:\d+)\]?\s*(.+?):\s*(.+)/i);
        if (!m) return null;
        const [, time, speaker, text] = m;
        return { time, speaker: speaker.trim(), text };
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
          <h1 className="text-xl font-bold truncate">{baseName || "Call Analysis"}</h1>
          <p className="text-sm text-muted-foreground">{a.final_verdict || ""} · {taskStatus.duration || ""}</p>
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

      {/* Agent Summary (Executive Summary) */}
      {a.agent_summary && (
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <FileText className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Agent Summary</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">{a.agent_summary}</p>
        </section>
      )}

      {/* Project Assessment (Innovation Analysis) */}
      {(a.project_summary || a.project_data) && (
        <section className="glass-card overflow-hidden">
          <div className="p-6 border-b border-border/40 bg-accent/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-accent">
                <BarChart3 className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Project Assessment</h2>
              </div>
              {a.project_data?.notation?.category && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Category</p>
                    <p className="text-sm font-medium text-accent-foreground">{a.project_data.notation.category_interpretation}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl font-black text-accent-foreground shadow-lg shadow-accent/20">
                    {a.project_data.notation.category}
                  </div>
                </div>
              )}
            </div>
            {a.project_summary && (
              <p className="text-muted-foreground mt-4 leading-relaxed">{a.project_summary}</p>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Project Notations */}
            {a.project_data?.notation && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Potential Indicators</h3>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: "Idea Potential", value: a.project_data.notation.idea?.idea_potential, color: "bg-blue-500" },
                    { label: "Team Potential", value: a.project_data.notation.team?.team_potential, color: "bg-purple-500" },
                    { label: "Pilot Potential", value: a.project_data.notation.pilot?.pilot_potential, color: "bg-orange-500" },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{item.label}</span>
                        <span>{item.value?.toFixed(1) || "0.0"}/5.0</span>
                      </div>
                      <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-1000", item.color)} 
                          style={{ width: `${(item.value || 0) * 20}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {a.project_data.notation.operational_reading && (
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/10">
                    <h4 className="text-[10px] font-bold text-accent uppercase mb-2">Next Actions</h4>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      {a.project_data.notation.operational_reading}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Qualitative Evaluation */}
            {a.project_data?.qualitative && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">Maturity & Deployment</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Stage", value: a.project_data.qualitative.solution_evaluation?.situation_stage },
                    { label: "Status", value: a.project_data.qualitative.overall_situation?.situation_status },
                    { label: "Pilot Budget", value: a.project_data.qualitative.solution_evaluation?.mvp_budget },
                    { label: "Lead Time", value: a.project_data.qualitative.solution_evaluation?.mvp_duration },
                    { label: "Strategic Fit", value: a.project_data.qualitative.strategic_fit?.strategic_fit_ocp === "Oui" ? "Aligned" : "Not Aligned" },
                    { label: "Team Status", value: a.project_data.qualitative.team_and_skills?.team_status },
                  ].map((detail) => (
                    <div key={detail.label} className="p-3 rounded-lg bg-secondary/20 border border-border/40">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">{detail.label}</p>
                      <p className="text-xs font-medium truncate">{detail.value || "Not Specified"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Performance Metrics */}
      {quantMetrics.length > 0 && (
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6 text-accent">
            <BarChart3 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Performance Metrics</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {quantMetrics.map(([key, value]) => {
              const pct = scoreToPercent(value as string | number);
              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span>
                    <span className="font-semibold">{pct}/100</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Behavioral Analysis */}
      {a.behavioral_analysis && (
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6 text-purple-400">
            <Tag className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Behavioral Analysis</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Sentiment Index</Label>
                <div className="text-lg font-medium mt-1">{a.behavioral_analysis.sentiment}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Communication Tone</Label>
                <div className="text-lg font-medium mt-1">{a.behavioral_analysis.tone}</div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Key Topics & Keywords</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {a.behavioral_analysis.keywords.map((k) => (
                  <Badge key={k} variant="secondary" className="bg-secondary/50">{k}</Badge>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quantitative Data (Call Statistics) */}
      {a.quantitative && Object.keys(a.quantitative).length > 0 && (
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6 text-indigo-400">
            <BarChart3 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Call Statistics</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(a.quantitative).map(([key, value]) => (
              <div key={key} className="p-4 rounded-lg bg-secondary/20 text-center">
                <div className="text-xs text-muted-foreground uppercase mb-1">{key.replace(/_/g, " ")}</div>
                <div className="text-lg font-semibold">{String(value)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transcript */}
      {transcriptLines.length > 0 && (
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6 text-blue-400">
            <MessageSquare className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Interaction Transcript</h2>
          </div>
          <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
            {transcriptLines.map((line, i) => (
              <div key={i} className="flex gap-4">
                <div className="shrink-0 w-16 text-right pt-1">
                  <span className="text-[10px] font-mono text-muted-foreground">{line.time}</span>
                </div>
                <div className="flex-1">
                  <div className={`text-xs font-bold mb-1 ${line.speaker.toLowerCase().includes('a') || line.speaker.toLowerCase().includes('1') || line.speaker.toLowerCase().includes('agent') ? "text-primary" : "text-accent"}`}>
                    {line.speaker.toUpperCase()}
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{line.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Coaching & Feedback */}
      {(positiveObs.length > 0 || negativeObs.length > 0) && (
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6 text-success">
            <UserCheck className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Coaching & Feedback</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {positiveObs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-success/80 uppercase tracking-wider">Key Strengths</h3>
                <ul className="space-y-2">
                  {positiveObs.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-success">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {negativeObs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-warning/80 uppercase tracking-wider">Growth Opportunities</h3>
                <ul className="space-y-2">
                  {negativeObs.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-warning">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Technical Metadata */}
      <section className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6 text-muted-foreground">
          <Info className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Technical Metadata</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-secondary/20">
            <div className="text-xs text-muted-foreground uppercase mb-1">Duration</div>
            <div className="text-lg font-semibold">{taskStatus.duration || "—"}</div>
          </div>
          <div className="p-4 rounded-lg bg-secondary/20">
            <div className="text-xs text-muted-foreground uppercase mb-1">Cost (USD)</div>
            <div className="text-lg font-semibold">${taskStatus.cost_usd?.toFixed(4) || "—"}</div>
          </div>
          <div className="p-4 rounded-lg bg-secondary/20">
            <div className="text-xs text-muted-foreground uppercase mb-1">Verdict</div>
            <div className="text-lg font-semibold">{a.final_verdict || "—"}</div>
          </div>
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
