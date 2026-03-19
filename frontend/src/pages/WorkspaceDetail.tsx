import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Upload } from "lucide-react";
import { calls, workspaces } from "@/lib/mock-data";
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

  const workspace = workspaces.find((w) => w.id === id);
  const workspaceCalls = calls.filter((c) => c.workspaceId === id);
  const filteredCalls = workspaceCalls.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.agent.toLowerCase().includes(search.toLowerCase())
  );

  if (!workspace) return <div className="text-muted-foreground">Workspace not found</div>;

  const handleUploadComplete = (taskId: string) => {
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
          <p className="text-muted-foreground">{workspace.description}</p>
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
        {filteredCalls.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">
            {search ? "No calls match your search." : "No calls yet. Upload your first recording."}
          </p>
        )}
        {filteredCalls.map((c) => (
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
