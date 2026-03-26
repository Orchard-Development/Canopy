import { Download, Apple, Monitor, Code } from "lucide-react";
import { siteConfig } from "../../site.config";
import { useMemo } from "react";

const platformIcons: Record<string, typeof Download> = {
  macos: Apple,
  windows: Monitor,
  linux: Download,
};

function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux")) return "linux";
  return "macos";
}

export function Install() {
  const { download } = siteConfig;

  const { primary, others } = useMemo(() => {
    const detected = detectPlatform();
    const idx = download.options.findIndex((o) => o.platform === detected);
    const primaryIdx = idx >= 0 ? idx : 0;
    const p = download.options[primaryIdx];
    const rest = download.options.filter((_, i) => i !== primaryIdx);
    return { primary: p, others: rest };
  }, [download.options]);

  const betaLinks = download.beta ?? [];
  const showBeta = betaLinks.length > 0 && download.betaVersion !== download.stableVersion;

  return (
    <section id="download" className="py-24 px-6 border-t border-[var(--border)]">
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
              <button className="inline-flex items-center justify-center rounded-lg font-semibold text-base h-12 px-8 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer">
                {(() => {
                  const Icon = platformIcons[primary.platform] ?? Download;
                  return <Icon className="w-5 h-5 mr-2" />;
                })()}
                {primary.label}
              </button>
            </a>
            {primary.note && (
              <p className="text-sm text-[var(--muted-foreground)] mt-3">
                {primary.note}
              </p>
            )}
            {download.stableVersion && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1 opacity-60">
                v{download.stableVersion} — Stable
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

        {showBeta && (
          <div className="mt-12 pt-8 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--muted-foreground)] opacity-60 mb-4">
              Beta — v{download.betaVersion}
            </p>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {betaLinks.map((opt) => {
                const Icon = platformIcons[opt.platform] ?? Download;
                return (
                  <a
                    key={opt.platform}
                    href={opt.href}
                    className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] opacity-50 hover:opacity-80 transition-opacity"
                  >
                    <Icon className="w-3 h-3" />
                    {opt.label}
                  </a>
                );
              })}
            </div>

            {download.devVersion && download.devArchive && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <a
                  href={download.devArchive}
                  className="inline-flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)] opacity-40 hover:opacity-70 transition-opacity"
                >
                  <Code className="w-3 h-3" />
                  Dev source v{download.devVersion}
                </a>
                {download.devQuickstart && (
                  <a
                    href={download.devQuickstart}
                    className="text-[10px] text-[var(--muted-foreground)] opacity-40 hover:opacity-70 transition-opacity"
                  >
                    quickstart.ps1
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
