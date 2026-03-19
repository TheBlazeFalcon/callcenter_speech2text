import { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Phone, Clock, Plus, Loader2, UserPlus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  score: number;
  callCount: number;
  avgDuration: string;
  trend: "up" | "down" | "stable";
  workspace_id: string;
}

interface Workspace {
  id: string;
  name: string;
}

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColor = { up: "text-success", down: "text-destructive", stable: "text-muted-foreground" };

const Agents = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const { data: agents, isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (agent: { name: string; role: string; workspace_id: string }) => {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agent),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (agent: Partial<Agent> & { id: string }) => {
      const { id, ...data } = agent;
      const res = await fetch(`/api/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setOpen(false);
      setEditingAgent(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const resetForm = () => {
    setName("");
    setRole("");
    setWorkspaceId("");
  };

  const handleEdit = (e: React.MouseEvent, agent: Agent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingAgent(agent);
    setName(agent.name);
    setRole(agent.role);
    setWorkspaceId(agent.workspace_id);
    setOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this agent? All associated records will be removed.")) {
      deleteMutation.mutate(id);
    }
  };

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Agent Performance</h1>
          <p className="text-muted-foreground">Comprehensive performance monitoring and behavioral benchmarking.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> New Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingAgent ? "Edit Agent" : "Create Agent"}</DialogTitle>
              <DialogDescription>
                {editingAgent ? "Update agent details manually." : "Add a new call agent to your organization."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Sarah Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role / Department</Label>
                <Input
                  id="role"
                  placeholder="e.g. Customer Success"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="workspace">Workspace</Label>
                <select
                  id="workspace"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                >
                  <option value="">Select a workspace...</option>
                  {workspaces?.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
            </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setEditingAgent(null);
                    resetForm();
                  }}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="gradient-bg text-primary-foreground"
                  onClick={() => {
                    if (editingAgent) {
                      updateMutation.mutate({ id: editingAgent.id, name, role, workspace_id: workspaceId });
                    } else {
                      createMutation.mutate({ name, role, workspace_id: workspaceId });
                    }
                  }}
                  disabled={!name || !role || !workspaceId || createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingAgent ? "Update Agent" : "Create Agent"}
                </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents?.map((agent) => {
          const TrendIcon = trendIcon[agent.trend] || Minus;
          return (
            <Link key={agent.id} to={`/dashboard/agents/${agent.id}`} className="glass-card p-6 hover:border-primary/30 transition-all block relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => handleEdit(e, agent)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(e, agent.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {agent.avatar}
                </div>
                <div>
                  <div className="font-semibold">{agent.name}</div>
                  <div className="text-xs text-muted-foreground">{agent.role}</div>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold gradient-text">{agent.score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <TrendIcon className={`w-4 h-4 ml-auto ${trendColor[agent.trend] || "text-muted-foreground"}`} />
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {agent.callCount} interactions
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {agent.avgDuration} avg
                </div>
              </div>
            </Link>
          );
        })}
        {agents?.length === 0 && (
          <div className="col-span-full text-center py-20 bg-secondary/10 rounded-xl border border-dashed border-border">
            <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No agents yet</h3>
            <p className="text-muted-foreground">Add your first agent to start tracking performance.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Agents;
