import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-[120px] animate-glow-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/15 blur-[100px] animate-glow-pulse" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <span className="gradient-text">Falcon Call AI</span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Enterprise-grade call transcription & analysis
        </p>
        <p className="text-base text-muted-foreground/70 max-w-xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          Deep, actionable insights into agent performance. Transcribe, analyze, and optimize every customer interaction.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Button asChild size="lg" className="gradient-bg text-primary-foreground px-8 py-6 text-base font-semibold hover:opacity-90 transition-opacity">
            <Link to="/dashboard">
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8 py-6 text-base border-border/60 bg-secondary/30 hover:bg-secondary/50">
            <a href="#features">See Features</a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
