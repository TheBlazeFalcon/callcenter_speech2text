import React, { useState, useCallback } from "react";
import { Upload, File, X, CheckCircle2, AlertCircle, User, Hash, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  workspaceId: number;
  workspaceName: string;
  onUploadComplete?: (taskId: number) => void;
}

interface Agent {
  id: number;
  name: string;
}

type UploadState = "idle" | "uploading" | "processing" | "done" | "error";

const FileUpload = ({ workspaceId, workspaceName, onUploadComplete }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [agentId, setAgentId] = useState("");
  const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [analyses, setAnalyses] = useState<string[]>([
    "transcript",
    "summary",
    "project_analysis",
    "agent_performance",
  ]);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const toggleAnalysis = (type: string) => {
    setAnalyses((prev) =>
      prev.includes(type) ? prev.filter((a) => a !== type) : [...prev, type]
    );
  };

  const startUpload = async () => {
    if (!file || !agentId) return;
    setErrorMsg("");

    try {
      // Step 1: Upload file (fake progress during upload)
      setState("uploading");
      setProgress(10);

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { filename } = await uploadRes.json();
      setProgress(40);

      // Step 2: Start processing
      setState("processing");
      setProgress(50);

      // Find agent name for metadata
      const selectedAgent = agents?.find(a => a.id === Number(agentId));

      const processRes = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          workspace_id: workspaceId,
          project_id: projectId || String(workspaceId),
          project_name: workspaceName,
          agent_name: selectedAgent?.name || "Unknown Agent",
          agent_id: agentId ? Number(agentId) : null,
          analyses,
          skip_transcription: false,
        }),
      });
      if (!processRes.ok) throw new Error("Failed to start processing");
      const { task_id } = await processRes.json();
      setProgress(60);

      // Step 3: Poll for completion
      const poll = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/status/${task_id}`);
          const status = await statusRes.json();

          if (status.status === "completed") {
            clearInterval(poll);
            setProgress(100);
            setState("done");
            setTimeout(() => onUploadComplete?.(task_id), 800);
          } else if (status.status === "failed") {
            clearInterval(poll);
            setState("error");
            setErrorMsg(status.error || "Processing failed");
          } else {
            // Creep progress during processing
            setProgress((p) => Math.min(p + 5, 90));
          }
        } catch (pollErr) {
          clearInterval(poll);
          setState("error");
          setErrorMsg("Failed to check processing status");
        }
      }, 2000);
    } catch (err: unknown) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const reset = () => {
    setFile(null);
    setState("idle");
    setProgress(0);
    setAgentId("");
    setErrorMsg("");
  };

  const stateLabel: Record<UploadState, string> = {
    idle: "",
    uploading: "Uploading file...",
    processing: "Transcribing & analyzing...",
    done: "Analysis complete!",
    error: errorMsg,
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 flex flex-col items-center justify-center gap-4",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border/60 hover:border-primary/40 hover:bg-secondary/20"
          )}
        >
          <input
            type="file"
            accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.ogg,.flac"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileSelect}
          />
          <div className="w-16 h-16 rounded-full gradient-bg-subtle flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">Click or drag audio file</p>
            <p className="text-sm text-muted-foreground mt-1">MP3, WAV, M4A, or MP4</p>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 border-primary/20 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              {state === "error" ? (
                <AlertCircle className="w-6 h-6 text-destructive" />
              ) : state === "done" ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : (
                <File className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            {state === "idle" && (
              <Button variant="ghost" size="icon" onClick={reset}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {state === "idle" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3 h-3" />
                    Select Agent
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAgentSelectorOpen(!isAgentSelectorOpen)}
                      className={cn(
                        "w-full px-3 py-2.5 text-sm rounded-xl bg-secondary/20 border border-border/40 text-left flex items-center justify-between hover:bg-secondary/30 transition-all",
                        isAgentSelectorOpen && "ring-1 ring-primary border-primary/50"
                      )}
                    >
                      <span className={cn(!agentId && "text-muted-foreground")}>
                        {agentId ? agents?.find(a => a.id === Number(agentId))?.name : "Choose agent..."}
                      </span>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isAgentSelectorOpen && "rotate-180")} />
                    </button>
                    
                    {isAgentSelectorOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-card border-border/40 shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in duration-200">
                        {agents?.map(a => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setAgentId(String(a.id));
                              setIsAgentSelectorOpen(false);
                            }}
                            className="w-full px-4 py-2.5 text-sm text-left hover:bg-primary/10 transition-colors flex items-center justify-between"
                          >
                            {a.name}
                            {agentId === String(a.id) && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Hash className="w-3 h-3" />
                    Project ID
                  </label>
                  <input
                    type="text"
                    placeholder="External ID..."
                    className="w-full px-3 py-2.5 text-sm rounded-xl bg-secondary/20 border border-border/40 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1 h-3 bg-primary rounded-full" />
                  Select Analysis Options
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "transcript", label: "Transcript" },
                    { id: "summary", label: "Agent Summary" },
                    { id: "project_analysis", label: "Project Assessment" },
                    { id: "agent_performance", label: "Performance Score" },
                  ].map((type) => (
                    <div 
                      key={type.id}
                      onClick={() => toggleAnalysis(type.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98]",
                        analyses.includes(type.id)
                          ? "bg-primary/10 border-primary/50 shadow-[0_0_15px_-5px_rgba(var(--primary),0.3)] text-primary"
                          : "bg-secondary/5 border-border/20 text-muted-foreground hover:bg-secondary/10 hover:border-border/40"
                      )}
                    >
                      <div className={cn(
                        "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-300",
                        analyses.includes(type.id) 
                          ? "border-primary bg-primary scale-110 shadow-[0_0_8px_rgba(var(--primary),0.5)]" 
                          : "border-muted-foreground/30 shadow-none"
                      )}>
                        {analyses.includes(type.id) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-in zoom-in duration-300" />
                        )}
                      </div>
                      <span className="text-[11px] font-bold tracking-tight">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(state === "uploading" || state === "processing" || state === "done") && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>{stateLabel[state]}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {state === "error" && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}

          {state === "idle" && (
            <Button 
                className="w-full gradient-bg text-primary-foreground" 
                onClick={startUpload}
                disabled={!agentId}
            >
              Start Analysis
            </Button>
          )}

          {state === "error" && (
            <Button variant="outline" className="w-full" onClick={reset}>
              Try Again
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
