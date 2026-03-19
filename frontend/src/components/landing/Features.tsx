import { Mic, BarChart3, Users, Brain } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Precision Transcription",
    description: "High-fidelity audio-to-text conversion with automated speaker identification and precise timestamps.",
  },
  {
    icon: BarChart3,
    title: "Performance Intelligence",
    description: "Advanced behavioral scoring and trend analysis to benchmark agent performance across your workforce.",
  },
  {
    icon: Users,
    title: "Strategic Workspaces",
    description: "Organize and monitor quality assurance metrics across specific departments, teams, or campaigns.",
  },
  {
    icon: Brain,
    title: "Behavioral Insights",
    description: "Deep analysis of sentiment, tone, and key topics to identify coaching opportunities and customer needs.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
            Enterprise Intelligence
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Sophisticated tools designed to help you understand, optimize, and scale your communication operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="glass-card p-8 hover:border-primary/30 transition-all duration-300 group animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-lg gradient-bg flex items-center justify-center mb-5">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
