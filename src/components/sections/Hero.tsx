import { siteConfig } from "../../site.config";

export function Hero() {
  const { hero, name, tagline } = siteConfig;

  return (
    <section className="relative pt-32 pb-28 px-6 overflow-hidden">
      {/* Subtle gradient backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="mb-12 flex justify-center">
          <img
            src="/logo.png"
            alt={`${name} logo`}
            className="w-20 h-20"
          />
        </div>

        <p className="text-[var(--accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-6">
          {tagline}
        </p>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
          {hero.heading}
        </h1>

        <p className="mt-8 text-lg sm:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed">
          {hero.subheading}
        </p>

        <div className="mt-12 flex items-center justify-center gap-4">
          <a href="#download">
            <button className="inline-flex items-center justify-center rounded-lg font-semibold text-base h-13 px-10 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer shadow-[0_0_32px_rgba(99,102,241,0.25)]">
              Download
            </button>
          </a>
        </div>

        {/* Trust signals */}
        <div className="mt-16 flex items-center justify-center gap-8 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            SOC 2 compliant
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Runs locally
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Your data stays yours
          </span>
        </div>
      </div>
    </section>
  );
}
