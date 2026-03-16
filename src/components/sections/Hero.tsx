import { siteConfig } from "../../site.config";

export function Hero() {
  const { hero, name, tagline } = siteConfig;

  return (
    <section className="pt-24 pb-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="mb-10 flex justify-center">
          <img
            src="/logo.png"
            alt={`${name} logo`}
            className="w-24 h-24"
          />
        </div>

        <p className="text-[var(--muted-foreground)] text-sm font-medium tracking-widest uppercase mb-6">
          {tagline}
        </p>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
          {hero.heading}
        </h1>

        <p className="mt-6 text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed">
          {hero.subheading}
        </p>

        <div className="mt-10">
          <a href="#download">
            <button className="inline-flex items-center justify-center rounded-lg font-semibold text-base h-12 px-8 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer">
              Download
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}
