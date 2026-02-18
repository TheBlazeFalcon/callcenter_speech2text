import { useState, useEffect, useRef } from 'react';
import {
    Upload,
    FileCheck,
    Loader2,
    Download,
    RotateCcw,
    Briefcase,
    User,
    Hash,
    ArrowRight,
    Play,
    FileText,
    Layout,
    Info,
    CheckCircle,
    FileSpreadsheet
} from 'lucide-react';

type Stage = 'UPLOAD' | 'PROCESSING' | 'RESULT';

type TaskStatus = {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    filename: string;
    step: string;
    error?: string;
    duration?: number;
    total_time?: number;
    cost_mad?: number;
};

type Metadata = {
    project_id: string;
    project_name: string;
    agent_name: string;
};

function App() {
    const [stage, setStage] = useState<Stage>('UPLOAD');
    const [metadata, setMetadata] = useState<Metadata>({
        project_id: '',
        project_name: '',
        agent_name: ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [isTriggering, setIsTriggering] = useState(false);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
    const [outputs, setOutputs] = useState<string[]>([]);
    const [previews, setPreviews] = useState<Record<string, any>>({});

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let interval: number | undefined;
        if (activeTaskId && stage === 'PROCESSING') {
            interval = setInterval(updateStatus, 2000);
        }
        return () => clearInterval(interval);
    }, [activeTaskId, stage]);

    const updateStatus = async () => {
        if (!activeTaskId) return;
        try {
            const res = await fetch(`/api/status/${activeTaskId}`);
            if (!res.ok) return;
            const data = await res.json();
            setTaskStatus(data);
            if (data.status === 'completed') {
                await fetchOutputs(data.filename);
                setStage('RESULT');
            }
        } catch (err) {
            console.error("Status check failed:", err);
        }
    };

    const fetchOutputs = async (filename: string) => {
        const res = await fetch('/api/outputs');
        const data = await res.json();
        const base = filename.split('.')[0];
        const relevant = data.files.filter((f: string) => f.startsWith(base));
        setOutputs(relevant);

        const previewResults: Record<string, any> = {};
        for (const file of relevant) {
            if (file.endsWith('.docx') || file.endsWith('.csv')) {
                try {
                    const contentRes = await fetch(`/api/content/${file}`);
                    if (contentRes.ok) {
                        previewResults[file] = await contentRes.json();
                    }
                } catch (e) {
                    console.error("Preview fetch failed:", e);
                }
            }
        }
        setPreviews(previewResults);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) setFile(droppedFile);
    };

    const triggerUploadAndProcess = async () => {
        if (!file || !metadata.project_id || !metadata.project_name || !metadata.agent_name) {
            alert("Please provide all project details and an asset.");
            return;
        }
        setIsTriggering(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!uploadRes.ok) throw new Error("Upload failed");
            const uploadData = await uploadRes.json();

            const skipTranscription = file.name.endsWith('.docx');

            const processRes = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: uploadData.filename,
                    ...metadata,
                    skip_transcription: skipTranscription
                })
            });
            if (!processRes.ok) throw new Error("Processing failed");
            const data = await processRes.json();
            setActiveTaskId(data.task_id);
            setTaskStatus({ status: 'pending', filename: uploadData.filename, step: 'Starting' });
            setStage('PROCESSING');
        } catch (err) {
            alert("Failed to start analysis.");
        } finally {
            setIsTriggering(false);
        }
    };

    const resetSession = (keepMeta: boolean) => {
        setStage('UPLOAD');
        if (!keepMeta) setMetadata({ project_id: '', project_name: '', agent_name: '' });
        setFile(null);
        setActiveTaskId(null);
        setTaskStatus(null);
        setOutputs([]);
        setPreviews({});
    };

    const getSteps = () => {
        const isDoc = file?.name.endsWith('.docx');
        if (isDoc) {
            return [
                "Processing Document...",
                "Intelligence Analysis & Scoring...",
                "Finalizing Report & Data Export..."
            ];
        }
        return [
            "Voice-to-Text Transcription...",
            "Intelligence Analysis & Scoring...",
            "Finalizing Report & Data Export..."
        ];
    };

    const getStepProgress = () => {
        if (!taskStatus) return 0;
        const currentSteps = getSteps();

        // Map backend steps to frontend display steps for consistency
        const stepMapping: Record<string, string> = {
            "Transcription Status (Audio to Text)": currentSteps[0],
            "Using existing script": currentSteps[0],
            "Analysis Status (Summary & Assessment Generation)": currentSteps[1],
            "File Formatting (DOCX & Excel Preparation)": currentSteps[2],
            "Finished": "Complete"
        };

        const displayStep = stepMapping[taskStatus.step] || taskStatus.step;
        const index = currentSteps.indexOf(displayStep);

        if (index === -1) return taskStatus.status === 'completed' ? 100 : 0;
        return ((index + 1) / currentSteps.length) * 100;
    };

    const getDisplayStep = () => {
        if (!taskStatus) return "Initializing...";
        const currentSteps = getSteps();
        const stepMapping: Record<string, string> = {
            "Transcription Status (Audio to Text)": currentSteps[0],
            "Using existing script": currentSteps[0],
            "Analysis Status (Summary & Assessment Generation)": currentSteps[1],
            "File Formatting (DOCX & Excel Preparation)": currentSteps[2],
            "Finished": "Analysis Complete"
        };
        return stepMapping[taskStatus.step] || taskStatus.step;
    };

    return (
        <div className="flex h-screen bg-[#0a0a0b] text-slate-100 font-sans overflow-hidden">
            {/* Unified Sidebar for Metadata */}
            <aside className="w-80 border-r border-slate-900 bg-[#0d0d0e] p-8 flex flex-col gap-10">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-white mb-1">Falcon Call AI</h1>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-cyan-500/60">Professional Pipeline</p>
                </div>

                <div className="flex flex-col gap-8">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Info size={14} className="text-slate-600" /> Project Context
                        </h3>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-2">
                                    <Hash size={10} /> Project ID
                                </label>
                                <input
                                    className="w-full bg-slate-950/30 border border-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-800"
                                    placeholder="PRJ-2024-001"
                                    value={metadata.project_id}
                                    onChange={e => setMetadata({ ...metadata, project_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-2">
                                    <Briefcase size={10} /> Project Name
                                </label>
                                <input
                                    className="w-full bg-slate-950/30 border border-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-800"
                                    placeholder="Customer Support Q3"
                                    value={metadata.project_name}
                                    onChange={e => setMetadata({ ...metadata, project_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-2">
                                    <User size={10} /> Agent Name
                                </label>
                                <input
                                    className="w-full bg-slate-950/30 border border-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-800"
                                    placeholder="Yassine B."
                                    value={metadata.agent_name}
                                    onChange={e => setMetadata({ ...metadata, agent_name: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-8 border-t border-slate-900">
                    <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-900">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Falcon AI Online</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Status Bar / Stepper */}
                {stage === 'PROCESSING' && (
                    <div className="absolute top-0 left-0 right-0 z-10">
                        <div className="h-1 bg-slate-900 w-full overflow-hidden">
                            <div className="h-full bg-cyan-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(6,182,212,0.8)]" style={{ width: `${getStepProgress()}%` }} />
                        </div>
                        <div className="px-8 py-3 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-slate-900 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-cyan-500 tracking-widest flex items-center gap-2">
                                <Loader2 size={12} className="animate-spin" /> {getDisplayStep()}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{file?.name}</span>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto w-full scrollbar-thin">
                    <div className="max-w-screen-2xl mx-auto p-12 h-full flex flex-col">

                        {/* Stage: Upload */}
                        {stage === 'UPLOAD' && (
                            <div className="flex-1 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-700 max-w-2xl mx-auto w-full">
                                <div className="space-y-10">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-4xl font-black text-white">Intake Asset</h2>
                                        <p className="text-slate-500 font-medium">Ready the audio or script for professional assessment</p>
                                    </div>

                                    <div
                                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={onDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`
                                            border-2 border-dashed rounded-[3rem] p-20 text-center cursor-pointer transition-all duration-300
                                            ${isDragging ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-900 hover:border-slate-800 bg-slate-900/10'}
                                            ${file ? 'border-emerald-500/50 bg-emerald-500/10' : ''}
                                        `}
                                    >
                                        <input type="file" ref={fileInputRef} className="hidden" accept=".mp3,.wav,.m4a,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                        <div className={`mb-6 inline-flex p-6 rounded-full bg-slate-950 border border-slate-900 ${file ? 'text-emerald-500 border-emerald-500/20' : 'text-slate-500'}`}>
                                            {file ? <FileCheck size={48} /> : <Upload size={48} />}
                                        </div>
                                        <h3 className="text-2xl font-bold mb-2">{file ? file.name : 'Drop audio or document'}</h3>
                                        <p className="text-slate-600 font-medium">{file?.name.endsWith('.docx') ? 'Script script detected. Skipping transcription.' : 'Supports MP3, WAV, M4A, and DOCX scripts'}</p>
                                    </div>

                                    <button
                                        onClick={triggerUploadAndProcess}
                                        disabled={isTriggering || !file || !metadata.project_id}
                                        className="w-full bg-white text-black font-black py-6 rounded-[2.5rem] flex items-center justify-center gap-4 hover:bg-slate-200 transition-all active:scale-[0.98] shadow-2xl disabled:opacity-20 disabled:grayscale"
                                    >
                                        {isTriggering ? <Loader2 className="animate-spin" size={24} /> : <Play size={24} fill="currentColor" />}
                                        {isTriggering ? 'PREPARING ANALYSIS...' : 'START THE ANALYSIS'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Stage: Processing */}
                        {stage === 'PROCESSING' && (
                            <div className="flex-1 flex flex-col justify-center animate-in fade-in duration-1000 max-w-md mx-auto w-full">
                                <div className="text-center space-y-10">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-cyan-500/20 blur-[100px] rounded-full" />
                                        <div className="relative p-12 bg-slate-950 border border-slate-900 rounded-full inline-flex animate-float">
                                            <Loader2 size={120} className="animate-spin text-cyan-500" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">Falcon is Thinking</h3>
                                        <p className="text-slate-500 font-medium uppercase tracking-[0.2em] text-[10px]">{getDisplayStep()}</p>
                                        {taskStatus?.duration && (
                                            <p className="text-cyan-500/60 font-medium text-[10px] uppercase tracking-widest animate-pulse">
                                                Estimated Analysis Time: ~{Math.ceil(taskStatus.duration / 10)}s
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stage: Result (Vertical Stack) */}
                        {stage === 'RESULT' && (
                            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 space-y-16">
                                <div className="flex justify-between items-end border-b border-slate-900 pb-10">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-4 border border-emerald-500/20">
                                            <CheckCircle size={12} /> Pipeline Complete
                                        </div>
                                        <h2 className="text-6xl font-black tracking-tight">Analysis Results</h2>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => resetSession(true)} className="px-6 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400 hover:text-white font-bold transition-all flex items-center gap-2">
                                            <RotateCcw size={16} /> New Asset
                                        </button>
                                        <button onClick={() => resetSession(false)} className="px-6 py-4 bg-white text-black rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2 shadow-2xl shadow-white/5">
                                            Reset Context <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Stacked Results Container */}
                                <div className="flex flex-col gap-12">

                                    {/* 1. Narrative Report (Top) */}
                                    <div className="bg-[#0d0d0e] border border-slate-900 rounded-[3rem] flex flex-col shadow-2xl">
                                        <div className="px-10 py-8 border-b border-slate-900 flex justify-between items-center bg-slate-950/30">
                                            <div className="flex items-center gap-4 font-black text-[12px] uppercase tracking-[0.2em] text-slate-500">
                                                <FileText size={20} className="text-cyan-500" /> Narrative Report Preview
                                            </div>
                                            <a
                                                href={`/api/download/${outputs.find(o => o.endsWith('.docx'))}`}
                                                className="px-6 py-3 bg-cyan-500/10 text-cyan-500 rounded-2xl hover:bg-cyan-500 hover:text-white font-bold transition-all flex items-center gap-2"
                                                title="Download DOCX"
                                            >
                                                <Download size={18} /> DOCX
                                            </a>
                                        </div>
                                        <div className="p-16 h-[500px] overflow-y-auto font-serif leading-[1.8] text-slate-400 text-xl selection:bg-cyan-500/20 scrollbar-thin">
                                            {Object.entries(previews).find(([k]) => k.endsWith('.docx'))?.[1]?.content || 'Processing report content...'}
                                        </div>
                                    </div>

                                    {/* 2. Assessment Grid (Bottom) */}
                                    <div className="bg-[#0d0d0e] border border-slate-900 rounded-[3rem] flex flex-col shadow-2xl">
                                        <div className="px-10 py-8 border-b border-slate-900 flex justify-between items-center bg-slate-950/30">
                                            <div className="flex items-center gap-4 font-black text-[12px] uppercase tracking-[0.2em] text-slate-500">
                                                <Layout size={20} className="text-emerald-500" /> Assessment Data Grid
                                            </div>
                                            <div className="flex gap-4">
                                                <a
                                                    href={`/api/download/${outputs.find(o => o.endsWith('.xlsx'))}`}
                                                    className="px-6 py-3 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white font-bold transition-all flex items-center gap-2"
                                                    title="Download Excel"
                                                >
                                                    <FileSpreadsheet size={18} /> EXCEL (Worksheet)
                                                </a>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto min-h-[400px]">
                                            <table className="w-full text-left text-base">
                                                <thead className="sticky top-0 bg-[#0d0d0e] backdrop-blur-xl border-b border-slate-900">
                                                    <tr>
                                                        {Object.keys(Object.entries(previews).find(([k]) => k.endsWith('.csv'))?.[1]?.content?.[0] || {}).map(k => (
                                                            <th key={k} className="px-8 py-6 font-black uppercase text-[10px] text-slate-600 tracking-[0.2em]">{k.replace(/_/g, ' ')}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-900/50">
                                                    {(Object.entries(previews).find(([k]) => k.endsWith('.csv'))?.[1]?.content || []).map((row: any, i: number) => (
                                                        <tr key={i} className="hover:bg-cyan-500/5 group transition-colors">
                                                            {Object.values(row).map((v: any, j) => (
                                                                <td key={j} className="px-8 py-6 text-slate-400 font-medium group-hover:text-slate-200 transition-colors">{String(v)}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {(!Object.entries(previews).find(([k]) => k.endsWith('.csv'))?.[1]?.content) && (
                                                <div className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-sm">
                                                    Loading assessment data...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-20 pb-40 text-center">
                                    <p className="text-slate-700 text-xs font-bold uppercase tracking-[0.3em] mb-4">Analysis Pipeline Intelligence</p>
                                    <div className="inline-flex gap-8 p-8 rounded-[2.5rem] bg-slate-950/30 border border-slate-900 shadow-2xl">
                                        <div className="flex flex-col items-center gap-2 px-4">
                                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Call Duration</span>
                                            <span className="text-white font-black text-3xl tracking-tighter">
                                                {taskStatus?.duration ? `${Math.floor(taskStatus.duration / 60)}m ${Math.floor(taskStatus.duration % 60)}s` : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="w-px bg-slate-900/50" />
                                        <div className="flex flex-col items-center gap-2 px-4">
                                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Analysis Duration</span>
                                            <span className="text-white font-black text-3xl tracking-tighter">{taskStatus?.total_time?.toFixed(1)}s</span>
                                        </div>
                                        <div className="w-px bg-slate-900/50" />
                                        <div className="flex flex-col items-center gap-2 px-4">
                                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Estimated Cost</span>
                                            <span className="text-cyan-500 font-black text-3xl tracking-tighter">{taskStatus?.cost_mad?.toFixed(2)} MAD</span>
                                        </div>
                                        <div className="w-px bg-slate-900/50" />
                                        <div className="flex flex-col items-center gap-2 px-4">
                                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Format</span>
                                            <span className="text-white font-black text-3xl tracking-tighter">XLSX / DOCX</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
