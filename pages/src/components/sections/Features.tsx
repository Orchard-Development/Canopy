import { siteConfig } from "../../site.config";

export function Features() {
  const { features } = siteConfig;

  return (
    <section id="features" className="py-28 px-6 border-t border-[var(--border)]">
      <div className="max-w-5xl mx-auto">
        <p className="text-[var(--accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-4 text-center">
          Capabilities
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-6">
          Why teams choose Orchard
        </h2>
        <p className="text-[var(--muted-foreground)] text-center mb-20 max-w-2xl mx-auto text-lg">
          Most AI resets every session. Orchard compounds every session.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {features.map((feature) => (
            <div key={feature.title} className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
