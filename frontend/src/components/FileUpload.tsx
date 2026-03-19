import React, { useState, useCallback } from "react";
import { Upload, File, X, CheckCircle2, AlertCircle } from "lucide-react";
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
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Select Agent
                  </label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg bg-secondary/30 border border-border/50 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                  >
                    <option value="">Select an agent...</option>
                    {agents?.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Project ID
                  </label>
                  <input
                    type="text"
                    placeholder="External ID..."
                    className="w-full px-3 py-2 text-sm rounded-lg bg-secondary/30 border border-border/50 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                <div className="grid grid-cols-2 gap-2">
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
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all active:scale-95",
                        analyses.includes(type.id)
                          ? "bg-primary/5 border-primary shadow-sm text-primary"
                          : "bg-secondary/10 border-transparent text-muted-foreground hover:bg-secondary/20"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                        analyses.includes(type.id) ? "border-primary bg-primary" : "border-muted-foreground/30"
                      )}>
                        {analyses.includes(type.id) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                        )}
                      </div>
                      <span className="text-xs font-semibold">{type.label}</span>
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
