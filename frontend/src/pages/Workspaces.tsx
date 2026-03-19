import { useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, Users, Phone, TrendingUp, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
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

interface Workspace {
  id: string;
  name: string;
  description: string;
  status: string;
  agentCount: number;
  callCount: number;
  avgScore: number;
}

const Workspaces = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  const { data: workspaces, isLoading } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (ws: { name: string; description: string }) => {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ws),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (ws: Partial<Workspace> & { id: string }) => {
      const { id, ...data } = ws;
      const res = await fetch(`/api/workspaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setOpen(false);
      setEditingWorkspace(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const resetForm = () => {
    setNewName("");
    setNewDesc("");
  };

  const handleEdit = (e: React.MouseEvent, ws: Workspace) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingWorkspace(ws);
    setNewName(ws.name);
    setNewDesc(ws.description);
    setOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this workspace? All associated agents and calls will be permanently removed.")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold mb-1">Workspaces</h1>
          <p className="text-muted-foreground">Organize and manage your call analysis projects.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingWorkspace ? "Edit Workspace" : "Create Workspace"}</DialogTitle>
              <DialogDescription>
                {editingWorkspace ? "Update workspace details manually." : "Add a new workspace to organize your calls and agents."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Sales Q4"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <textarea
                  id="desc"
                  placeholder="Short project overview..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setEditingWorkspace(null);
                  resetForm();
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="gradient-bg text-primary-foreground"
                onClick={() => {
                  if (editingWorkspace) {
                    updateMutation.mutate({ id: editingWorkspace.id, name: newName, description: newDesc });
                  } else {
                    createMutation.mutate({ name: newName, description: newDesc });
                  }
                }}
                disabled={!newName || createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingWorkspace ? "Update Workspace" : "Create Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces?.map((ws) => (
          <Link
            key={ws.id}
            to={`/dashboard/workspaces/${ws.id}`}
            className="glass-card p-6 hover:border-primary/30 transition-all block relative group"
          >
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => handleEdit(e, ws)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => handleDelete(e, ws.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg gradient-bg-subtle flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <Badge
                variant="outline"
                className={
                  ws.status === "active"
                    ? "bg-success/20 text-success border-success/30"
                    : "bg-muted text-muted-foreground"
                }
              >
                {ws.status}
              </Badge>
            </div>

            <h3 className="font-semibold text-base mb-1">{ws.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {ws.description || "No description provided."}
            </p>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Users className="w-3 h-3" />
                </div>
                <div className="text-sm font-semibold">{ws.agentCount}</div>
                <div className="text-[10px] text-muted-foreground">Agents</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Phone className="w-3 h-3" />
                </div>
                <div className="text-sm font-semibold">{ws.callCount}</div>
                <div className="text-[10px] text-muted-foreground">Calls</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <TrendingUp className="w-3 h-3" />
                </div>
                <div className="text-sm font-semibold gradient-text">{ws.avgScore}</div>
                <div className="text-[10px] text-muted-foreground">Avg Score</div>
              </div>
            </div>
          </Link>
        ))}
        {workspaces?.length === 0 && (
          <div className="col-span-full text-center py-20 bg-secondary/10 rounded-xl border border-dashed border-border">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No workspaces yet</h3>
            <p className="text-muted-foreground">Create your first project to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workspaces;
