import { Github } from "lucide-react";
import { siteConfig } from "../../site.config";

export function Footer() {
  const { name, links } = siteConfig;

  return (
    <footer className="border-t border-[var(--border)] py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt={name} className="w-6 h-6" />
            <span className="text-sm font-medium">{name}</span>
          </div>

          <div className="flex items-center gap-8 text-sm text-[var(--muted-foreground)]">
            <a href="#features" className="hover:text-[var(--foreground)] transition-colors">
              Features
            </a>
            <a href={links.docs} className="hover:text-[var(--foreground)] transition-colors">
              Docs
            </a>
            <a
              href={links.github}
              className="hover:text-[var(--foreground)] transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--muted-foreground)]">
            {name}
          </p>
          <div className="flex items-center gap-6 text-xs text-[var(--muted-foreground)]">
            <a href="#/terms" className="hover:text-[var(--foreground)] transition-colors">
              Terms of Service
            </a>
            <a href="#/privacy" className="hover:text-[var(--foreground)] transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
