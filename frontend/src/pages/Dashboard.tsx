import { Phone, Users, TrendingUp, FolderKanban, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      return res.json();
    }
  });

  const { data: outputFiles, isLoading: filesLoading } = useQuery({
    queryKey: ["output-files"],
    queryFn: async () => {
      const res = await fetch("/api/outputs");
      const { files } = await res.json();
      return files;
    }
  });

  const isLoading = statsLoading || filesLoading;

  const statCards = [
    { label: "Total Calls", value: stats?.totalCalls || 0, trend: stats?.callsTrend || "0%", icon: Phone, up: true },
    { label: "Active Agents", value: stats?.activeAgents || 0, trend: "+0", icon: Users, up: true },
    { label: "Avg Score", value: stats?.avgScore || 0, trend: stats?.scoreTrend || "0%", icon: TrendingUp, up: true },
    { label: "Workspaces", value: stats?.totalWorkspaces || 0, trend: "0", icon: FolderKanban, up: false },
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your call intelligence platform.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            {isLoading ? (
               <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold">{s.value}</div>
            )}
            <div className="flex items-center gap-1 mt-1 text-xs">
              <span className="text-muted-foreground">Updated in real-time</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Output Files</h2>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">Filename</th>
                  <th className="text-right py-3 px-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {outputFiles?.map((file: string) => (
                  <tr key={file} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-2 font-medium">{file}</td>
                    <td className="py-3 px-2 text-right">
                      <a href={`/api/download/${file}`} download className="text-primary hover:underline font-medium">Download</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
