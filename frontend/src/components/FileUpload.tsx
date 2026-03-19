import React, { useState, useCallback } from "react";
import { Upload, File, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  workspaceId: string;
  workspaceName: string;
  onUploadComplete?: (taskId: string) => void;
}

type UploadState = "idle" | "uploading" | "processing" | "done" | "error";

const FileUpload = ({ workspaceId, workspaceName, onUploadComplete }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [agentName, setAgentName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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

  const startUpload = async () => {
    if (!file) return;
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

      const processRes = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          project_id: workspaceId,
          project_name: workspaceName,
          agent_name: agentName || "Unknown Agent",
          skip_transcription: false,
        }),
      });
      if (!processRes.ok) throw new Error("Failed to start processing");
      const { task_id } = await processRes.json();
      setProgress(60);

      // Step 3: Poll for completion
      const poll = setInterval(async () => {
        const statusRes = await fetch(`/api/status/${task_id}`);
        const status = await statusRes.json();

        if (status.status === "completed") {
          clearInterval(poll);
          setProgress(100);
          setState("done");
          setTimeout(() => onUploadComplete?.(task_id), 800);
        } else if (status.status === "failed") {
          clearInterval(poll);
          throw new Error(status.error || "Processing failed");
        } else {
          // Creep progress during processing
          setProgress((p) => Math.min(p + 5, 90));
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
    setAgentName("");
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
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Agent Name (optional)
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. Sarah Chen"
                className="w-full px-3 py-2 text-sm rounded-lg bg-secondary/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
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
            <Button className="w-full gradient-bg text-primary-foreground" onClick={startUpload}>
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
