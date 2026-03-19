import { TrendingUp, TrendingDown, Minus, Phone, Clock } from "lucide-react";
import { agents } from "@/lib/mock-data";

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColor = { up: "text-success", down: "text-destructive", stable: "text-muted-foreground" };

const Agents = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Agent Performance</h1>
        <p className="text-muted-foreground">Comprehensive performance monitoring and behavioral benchmarking.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const TrendIcon = trendIcon[agent.trend];
          return (
            <div key={agent.id} className="glass-card p-6 hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {agent.avatar}
                </div>
                <div>
                  <div className="font-semibold">{agent.name}</div>
                  <div className="text-xs text-muted-foreground">{agent.role}</div>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold gradient-text">{agent.score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <TrendIcon className={`w-4 h-4 ml-auto ${trendColor[agent.trend]}`} />
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {agent.callCount} interactions
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {agent.avgDuration} avg
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Agents;
