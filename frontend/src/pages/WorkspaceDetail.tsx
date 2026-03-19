import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Upload, Loader2, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FileUpload from "@/components/FileUpload";

interface Call {
  id: number;
  title: string;
  filename: string;
  status: string;
  duration: string;
  date: string;
  agent: string;
  score: number;
}

interface Workspace {
  id: number;
  name: string;
  description: string;
}

const statusColor: Record<string, string> = {
  completed: "bg-success/20 text-success border-success/30",
  processing: "bg-warning/20 text-warning border-warning/30",
  pending: "bg-muted text-muted-foreground border-border",
};

const WorkspaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: workspace, isLoading: wsLoading } = useQuery<Workspace>({
    queryKey: ["workspace", id],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${id}`);
      if (!res.ok) throw new Error("Workspace not found");
      return res.json();
    },
  });

  const { data: calls, isLoading: callsLoading } = useQuery<Call[]>({
    queryKey: ["workspace-calls", id],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${id}/calls`);
      if (!res.ok) throw new Error("Failed to fetch calls");
      return res.json();
    },
  });

  const filteredCalls = calls?.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.agent.toLowerCase().includes(search.toLowerCase())
  );

  if (wsLoading || callsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) return <div className="text-muted-foreground text-center py-20">Workspace not found</div>;

  const handleUploadComplete = (taskId: number) => {
    setIsUploadOpen(false);
    navigate(`/dashboard/calls/${taskId}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/dashboard/workspaces"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
          <p className="text-muted-foreground">{workspace.description || "No description provided."}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search calls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30 border-border/50"
          />
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-primary-foreground">
              <Upload className="w-4 h-4 mr-2" /> Upload Call
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] glass-card border-border/40">
            <DialogHeader>
              <DialogTitle>Upload Call Recording</DialogTitle>
              <DialogDescription>
                Upload an audio file to start the AI transcription and analysis process.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <FileUpload
                workspaceId={workspace.id}
                workspaceName={workspace.name}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {filteredCalls?.length === 0 && (
          <div className="text-center py-20 bg-secondary/10 rounded-xl border border-dashed border-border">
            <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">
              {search ? "No calls match your search" : "No calls yet"}
            </h3>
            <p className="text-muted-foreground">
              {search ? "Try adjusting your filters" : "Upload your first recording to get started."}
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
                {c.agent} · {c.duration} · {c.date}
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4 shrink-0">
              <Badge variant="outline" className={statusColor[c.status]}>{c.status}</Badge>
              <span className="text-sm font-semibold w-8 text-right">{c.score > 0 ? c.score : "—"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceDetail;
