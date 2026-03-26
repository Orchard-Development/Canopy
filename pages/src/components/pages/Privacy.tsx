import { siteConfig } from "../../site.config";

export function Privacy() {
  const { name } = siteConfig;
  return (
    <div className="max-w-3xl mx-auto px-6 pt-32 pb-20 text-[var(--muted-foreground)] text-sm leading-relaxed">
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Privacy Policy</h1>
      <p className="mb-8 text-xs">Last updated: March 17, 2026</p>

      <p className="mb-4">
        This Privacy Policy describes how {name} ("we", "us", "the Software") collects, uses, and
        handles your information when you use our desktop application.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">1. Information We Collect</h2>
      <p className="mb-2">We may collect the following types of data:</p>
      <ul className="list-disc pl-6 mb-4 space-y-1">
        <li>Usage telemetry (features used, session duration, interaction patterns)</li>
        <li>Session metadata and agent activity logs</li>
        <li>Device and system information (OS, architecture, app version)</li>
        <li>Error reports and crash diagnostics</li>
        <li>Workspace configuration and project metadata</li>
        <li>Content you provide to AI agents within the Software</li>
      </ul>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">2. How We Use Your Data</h2>
      <p className="mb-2">We use collected data to:</p>
      <ul className="list-disc pl-6 mb-4 space-y-1">
        <li>Provide, maintain, and improve the Software</li>
        <li>Develop new features and capabilities</li>
        <li>Train and improve AI models and agent behavior</li>
        <li>Analyze usage patterns and fix bugs</li>
        <li>Communicate product updates</li>
      </ul>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">3. Data Storage</h2>
      <p className="mb-4">
        Most data is stored locally on your device. When you use features that connect to our
        servers (authentication, cloud sync, AI services), data may be transmitted and stored on
        our infrastructure. We use commercially reasonable measures to protect your data.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">4. Third-Party Services</h2>
      <p className="mb-4">
        The Software may integrate with third-party AI providers (such as Anthropic, OpenAI) and
        cloud services (such as Supabase, Cloudflare). Data sent to these services is subject to
        their respective privacy policies. We are not responsible for the privacy practices of
        third-party services.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">5. Data Sharing</h2>
      <p className="mb-4">
        We do not sell your personal data. We may share anonymized, aggregated data for analytics
        purposes. We may disclose data if required by law or to protect our rights.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">6. Your Rights</h2>
      <p className="mb-4">
        You may request deletion of your account and associated data by contacting us. Local data
        can be deleted by uninstalling the Software and removing its data directory.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">7. Changes to This Policy</h2>
      <p className="mb-4">
        We may update this Privacy Policy at any time. Continued use of the Software after changes
        constitutes acceptance of the updated policy.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">8. Contact</h2>
      <p className="mb-4">
        For questions about this Privacy Policy, please open an issue on
        our <a href={siteConfig.links.github} className="text-[var(--primary)] underline">GitHub repository</a>.
      </p>

      <div className="mt-12 pt-8 border-t border-[var(--border)]">
        <a href="#/" className="text-[var(--primary)] hover:underline text-sm">Back to home</a>
      </div>
    </div>
  );
}
