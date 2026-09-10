import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function LegalSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-slate-200 pt-8">
      <h2 className="text-xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700 sm:text-base">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-5 list-disc space-y-2 marker:text-cyan-600">
      {children}
    </ul>
  );
}

export default function LegalPage({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="bg-gradient-to-b from-cyan-50/70 via-white to-indigo-50/60 px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/login"
            aria-label="Return to OASIS sign in"
            className="relative h-16 w-24"
          >
            <Image
              src="/oasis-logo.png"
              alt="OASIS"
              fill
              sizes="96px"
              className="object-contain"
              priority
            />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            Back to OASIS
          </Link>
        </div>

        <article className="mt-6 rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-xl shadow-slate-200/50 sm:px-10 sm:py-11">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-cyan-700">
            OASIS legal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            {description}
          </p>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Effective 10 September 2026 · Version 1.0
          </p>

          <div className="mt-10 space-y-8">{children}</div>
        </article>
      </div>
    </main>
  );
}
