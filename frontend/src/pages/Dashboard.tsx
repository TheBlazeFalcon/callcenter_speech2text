import { Phone, Users, TrendingUp, FolderKanban, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { dashboardStats, calls } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const statCards = [
  { label: "Total Calls", value: dashboardStats.totalCalls.toLocaleString(), trend: dashboardStats.callsTrend, icon: Phone, up: true },
  { label: "Active Agents", value: dashboardStats.activeAgents, trend: "+2", icon: Users, up: true },
  { label: "Avg Score", value: dashboardStats.avgScore, trend: dashboardStats.scoreTrend, icon: TrendingUp, up: true },
  { label: "Workspaces", value: dashboardStats.totalWorkspaces, trend: "0", icon: FolderKanban, up: false },
];

const statusColor: Record<string, string> = {
  completed: "bg-success/20 text-success border-success/30",
  processing: "bg-warning/20 text-warning border-warning/30",
  pending: "bg-muted text-muted-foreground border-border",
};

const Dashboard = () => {
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
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="flex items-center gap-1 mt-1 text-xs">
              {s.up ? <ArrowUpRight className="w-3 h-3 text-success" /> : <ArrowDownRight className="w-3 h-3 text-muted-foreground" />}
              <span className={s.up ? "text-success" : "text-muted-foreground"}>{s.trend}</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Transcriptions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="text-left py-3 px-2 font-medium">Title</th>
                <th className="text-left py-3 px-2 font-medium">Agent</th>
                <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Workspace</th>
                <th className="text-left py-3 px-2 font-medium hidden sm:table-cell">Duration</th>
                <th className="text-left py-3 px-2 font-medium">Status</th>
                <th className="text-right py-3 px-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {calls.slice(0, 5).map((t) => (
                <tr key={t.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-2 font-medium">
                    <Link to={`/dashboard/calls/${t.id}`} className="hover:text-primary transition-colors">{t.title}</Link>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">{t.agent}</td>
                  <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{t.workspaceId}</td>
                  <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{t.duration}</td>
                  <td className="py-3 px-2">
                    <Badge variant="outline" className={statusColor[t.status]}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-right font-semibold">{t.score > 0 ? t.score : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
