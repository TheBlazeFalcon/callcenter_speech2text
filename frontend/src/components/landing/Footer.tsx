const Footer = () => {
  return (
    <footer className="border-t border-border/40 py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold gradient-text">Falcon Call AI</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 Falcon Call AI. Enterprise-grade call intelligence.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
