import { Link } from "react-router-dom";
import { FolderKanban, Users, Phone, TrendingUp, Plus } from "lucide-react";
import { workspaces } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const Workspaces = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Workspaces</h1>
          <p className="text-muted-foreground">Organize and manage your call analysis projects.</p>
        </div>
        <Button className="gradient-bg text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> New Workspace
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((ws) => (
          <Link
            key={ws.id}
            to={`/dashboard/workspaces/${ws.id}`}
            className="glass-card p-6 hover:border-primary/30 transition-all block"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg gradient-bg-subtle flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <Badge
                variant="outline"
                className={ws.status === "active" ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground"}
              >
                {ws.status}
              </Badge>
            </div>

            <h3 className="font-semibold text-base mb-1">{ws.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{ws.description}</p>

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
      </div>
    </div>
  );
};

export default Workspaces;
