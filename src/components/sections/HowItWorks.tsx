import { siteConfig } from "../../site.config";

export function HowItWorks() {
  const { steps } = siteConfig;

  return (
    <section className="py-24 px-6 border-t border-[var(--border)]">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
          Get started in minutes
        </h2>

        <div className="space-y-12">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-6">
              <div className="shrink-0 w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-sm font-mono text-[var(--muted-foreground)]">
                {step.number}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">{step.title}</h3>
                <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
