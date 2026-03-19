import { Upload, Cpu, LineChart } from "lucide-react";

const steps = [
  { icon: Upload, title: "Upload", description: "Upload audio files or paste scripts — any format supported." },
  { icon: Cpu, title: "Analyze", description: "AI transcribes and analyzes every interaction in seconds." },
  { icon: LineChart, title: "Optimize", description: "Get actionable insights, scores, and coaching recommendations." },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">How It Works</h2>
          <p className="text-muted-foreground text-lg">Three steps to better call performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.title} className="text-center animate-fade-in" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="w-16 h-16 rounded-2xl gradient-bg-subtle border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <div className="text-sm font-semibold text-primary mb-2">Step {i + 1}</div>
              <h3 className="text-xl font-bold mb-2 text-foreground">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
