import Link from "next/link";

import { LandingFooter } from "@/components/landing/LandingFooter";

export default function PricingPage() {
  return (
    <div className="bg-[var(--bg-primary)] pt-28 text-[var(--text-primary)]">
      <main className="mx-auto max-w-[1200px] space-y-6 px-4 pb-16 sm:px-6">
        <section className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
          <h1 className="text-3xl font-semibold">Usage-Based Infrastructure Pricing</h1>
          <p className="mt-3 max-w-3xl text-sm text-[var(--text-secondary)]">
            AdmitFlow pricing aligns to workflow executions, event volume, and deployment environments. Exact commercial
            tiers are provisioned during onboarding.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {[
            { title: "Developer", value: "Sandbox", detail: "Single institution test environments" },
            { title: "Scale", value: "Per execution", detail: "Metered deterministic runtime and streams" },
            { title: "Enterprise", value: "Custom", detail: "Security controls, SSO, dedicated support" },
          ].map((card) => (
            <article
              key={card.title}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
            >
              <p className="text-sm text-[var(--text-secondary)]">{card.title}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">Need pricing for your institution portfolio?</p>
          <Link
            href="/docs/introduction"
            className="mt-3 inline-block rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)]"
          >
            Review Platform Docs
          </Link>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
