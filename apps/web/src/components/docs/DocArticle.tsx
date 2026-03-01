import { resolveDoc } from "@/data/docs";

import { CodeBlock } from "./CodeBlock";

type DocArticleProps = {
  path: string;
};

export function DocArticle({ path }: DocArticleProps) {
  const doc = resolveDoc(path);

  return (
    <article className="mx-auto max-w-4xl">
      <header className="border-b border-[var(--border-default)] pb-6">
        <h1 className="text-4xl font-semibold text-[var(--text-primary)]">{doc.title}</h1>
        <p className="mt-3 text-base text-[var(--text-secondary)]">{doc.description}</p>
        <p className="mt-3 text-xs text-[var(--text-muted)]">Last updated {doc.updatedAt}</p>
      </header>

      <div className="space-y-10 py-8">
        {doc.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20 space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-8 text-[var(--text-secondary)]">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-[var(--text-secondary)]">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.code && <CodeBlock code={section.code} language="typescript" />}
          </section>
        ))}
      </div>
    </article>
  );
}
