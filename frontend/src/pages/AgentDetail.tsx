import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Search, Loader2, Phone, TrendingUp, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Call {
  id: string;
  title: string;
  filename: string;
  status: string;
  duration: string;
  date: string;
  score: number;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar_url?: string;
  workspace_id: string;
}

const statusColor: Record<string, string> = {
  completed: "bg-success/20 text-success border-success/30",
  processing: "bg-warning/20 text-warning border-warning/30",
  pending: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
};

const AgentDetail = () => {
  const { id } = useParams();
  const [search, setSearch] = useState("");

  const { data: agent, isLoading: agentLoading } = useQuery<Agent>({
    queryKey: ["agent", id],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${id}`);
      if (!res.ok) throw new Error("Agent not found");
      return res.json();
    },
  });

  const { data: calls, isLoading: callsLoading } = useQuery<Call[]>({
    queryKey: ["agent-calls", id],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${id}/calls`);
      if (!res.ok) throw new Error("Failed to fetch calls");
      return res.json();
    },
  });

  const filteredCalls = calls?.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.filename.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = calls?.length 
    ? Math.round(calls.reduce((acc, c) => acc + (c.score || 0), 0) / calls.length) 
    : 0;

  if (agentLoading || callsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) return <div className="text-muted-foreground text-center py-20">Agent not found</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/dashboard/agents"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-lg">
            {agent.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-muted-foreground">{agent.role}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Average Performance</span>
          </div>
          <div className="text-3xl font-bold gradient-text">{avgScore}/100</div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Phone className="w-4 h-4" />
            <span className="text-sm font-medium">Total Interactions</span>
          </div>
          <div className="text-3xl font-bold">{calls?.length || 0}</div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Last Active</span>
          </div>
          <div className="text-3xl font-bold text-sm">
            {calls?.length ? calls[0].date : "No activity"}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Interaction History</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search calls..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary/30 border-border/50"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredCalls?.length === 0 && (
            <div className="text-center py-20 bg-secondary/10 rounded-xl border border-dashed border-border">
              <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">
                {search ? "No calls match your search" : "No activity recorded yet"}
              </h3>
              <p className="text-muted-foreground">
                {search ? "Try adjusting your filters" : "This agent hasn't processed any calls yet."}
              </p>
            </div>
          )}
          {filteredCalls?.map((c) => (
            <Link
              key={c.id}
              to={`/dashboard/calls/${c.id}`}
              className="glass-card p-4 flex items-center justify-between hover:border-primary/30 transition-all block"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.title}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {c.duration} · {c.date} · {c.filename}
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <Badge variant="outline" className={statusColor[c.status]}>{c.status}</Badge>
                <div className="flex flex-col items-end min-w-[3rem]">
                  <span className="text-sm font-semibold">{c.score > 0 ? c.score : "—"}</span>
                  <span className="text-[10px] text-muted-foreground">Score</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentDetail;
