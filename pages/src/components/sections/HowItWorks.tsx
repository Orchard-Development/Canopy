import { siteConfig } from "../../site.config";

export function HowItWorks() {
  const { steps } = siteConfig;

  return (
    <section id="how-it-works" className="py-28 px-6 border-t border-[var(--border)]">
      <div className="max-w-3xl mx-auto">
        <p className="text-[var(--accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-4 text-center">
          How it works
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-20">
          Get started in minutes
        </h2>

        <div className="space-y-14">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-8 items-start">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-sm font-semibold text-[var(--primary)]">
                {step.number}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-[var(--muted-foreground)] text-sm leading-relaxed max-w-md">
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
