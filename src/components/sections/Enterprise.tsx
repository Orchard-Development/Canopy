import { Shield, Users, BarChart3, Lock, Server, GitBranch } from "lucide-react";

const capabilities = [
  {
    icon: Shield,
    title: "Zero data exposure",
    description:
      "Orchard runs entirely on your infrastructure. No data leaves your network. No cloud dependency. Full air-gap support.",
  },
  {
    icon: Users,
    title: "Team-wide memory",
    description:
      "Shared skills, rules, and context across your engineering org. Onboard new developers in hours, not weeks.",
  },
  {
    icon: BarChart3,
    title: "Measurable ROI",
    description:
      "Track skill reuse, time saved, and productivity gains. Enterprise dashboard shows exactly where Orchard compounds value.",
  },
  {
    icon: Lock,
    title: "Enterprise auth",
    description:
      "SSO, RBAC, and audit logs out of the box. Integrate with your existing identity provider. Full compliance trail.",
  },
  {
    icon: Server,
    title: "Self-hosted",
    description:
      "Deploy on-prem or in your VPC. No SaaS dependency. Your IT team controls the entire stack.",
  },
  {
    icon: GitBranch,
    title: "Multi-tool orchestration",
    description:
      "Cursor, Claude Code, Windsurf, Codex -- unified under one brain. Standardize AI workflows across your org.",
  },
];

export function Enterprise() {
  return (
    <section className="py-28 px-6 border-t border-[var(--border)]">
      <div className="max-w-5xl mx-auto">
        <p className="text-[var(--accent)] text-xs font-semibold tracking-[0.2em] uppercase mb-4 text-center">
          Built for teams
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-6">
          Enterprise-grade from day one
        </h2>
        <p className="text-[var(--muted-foreground)] text-center mb-20 max-w-2xl mx-auto text-lg">
          Your team's collective intelligence, compounding with every session.
          No vendor lock-in. No data risk.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {capabilities.map((cap) => (
            <div key={cap.title} className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mb-4">
                <cap.icon className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <h3 className="text-base font-semibold">{cap.title}</h3>
              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
                {cap.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
