import { useState, useEffect } from "react";
import { siteConfig } from "../../site.config";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt={siteConfig.name} className="w-7 h-7" />
          <span className="font-semibold text-sm tracking-tight">
            {siteConfig.name}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-8 text-sm text-[var(--muted-foreground)]">
          <a href="#features" className="hover:text-[var(--foreground)] transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-[var(--foreground)] transition-colors">
            How it works
          </a>
          <a href="#download" className="hover:text-[var(--foreground)] transition-colors">
            Download
          </a>
        </div>

        <a href="#download">
          <button className="h-9 px-5 text-sm font-medium rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer">
            Download
          </button>
        </a>
      </div>
    </nav>
  );
}
