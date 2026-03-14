import { Download, Apple, Monitor } from "lucide-react";
import { siteConfig } from "../../site.config";
import { Button } from "../ui/Button";

const platformIcons: Record<string, typeof Download> = {
  macos: Apple,
  windows: Monitor,
  linux: Download,
};

export function Install() {
  const { download } = siteConfig;
  const primary = download.options[0];
  const others = download.options.slice(1);

  return (
    <section id="download" className="py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          {download.heading}
        </h2>
        <p className="text-[var(--muted-foreground)] mb-10">
          {download.subheading}
        </p>

        {primary && (
          <div className="mb-8">
            <a href={primary.href}>
              <Button className="text-lg px-8 py-4 h-auto">
                <Download className="w-5 h-5 mr-2" />
                {primary.label}
              </Button>
            </a>
            {primary.note && (
              <p className="text-sm text-[var(--muted-foreground)] mt-3">
                {primary.note}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-6 flex-wrap">
          {others.map((opt) => {
            const Icon = platformIcons[opt.platform] ?? Download;
            return (
              <a
                key={opt.platform}
                href={opt.href}
                className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <Icon className="w-4 h-4" />
                {opt.label}
                {opt.note && (
                  <span className="text-xs opacity-60">({opt.note})</span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
