import { siteConfig } from "../../site.config";

export function Features() {
  const { features } = siteConfig;

  return (
    <section className="py-24 px-6 border-t border-[var(--border)]">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          Why Orchard
        </h2>
        <p className="text-[var(--muted-foreground)] text-center mb-16 max-w-2xl mx-auto">
          Most AI resets every session. Orchard compounds every session.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="space-y-3">
              <div className="flex items-center gap-3">
                <feature.icon className="w-5 h-5 text-[var(--primary)] shrink-0" />
                <h3 className="text-base font-semibold">{feature.title}</h3>
              </div>
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
