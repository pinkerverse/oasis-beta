import Link from "next/link";

export default function LegalFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-5 py-5 text-sm text-slate-500">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-3 sm:flex-row">
        <p>© {new Date().getFullYear()} OASIS</p>
        <nav aria-label="Legal" className="flex items-center gap-5">
          <Link
            href="/privacy"
            className="font-medium text-slate-600 transition hover:text-slate-950"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="font-medium text-slate-600 transition hover:text-slate-950"
          >
            Terms of Use
          </Link>
        </nav>
      </div>
    </footer>
  );
}
