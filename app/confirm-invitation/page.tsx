import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Confirm your invitation · OASIS",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function isValidTokenHash(value: string) {
  return (
    value.length >= 20 &&
    value.length <= 512 &&
    /^[A-Za-z0-9._~-]+$/.test(value)
  );
}

export default async function ConfirmInvitationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const tokenHash = singleValue(query.token_hash);
  const validInvitation =
    singleValue(query.type) === "invite" && isValidTokenHash(tokenHash);
  const confirmationHref = validInvitation
    ? `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=invite&next=${encodeURIComponent("/accept-invitation")}`
    : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-slate-50 to-indigo-100 px-5 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-7 pb-6 pt-7">
          <div className="relative mx-auto h-20 w-32">
            <Image
              src="/oasis-logo.png"
              alt="OASIS"
              fill
              sizes="128px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="px-7 pb-8 pt-6">
          {validInvitation ? (
            <>
              <p className="text-sm font-semibold text-cyan-800">
                Secure school invitation
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                You’ve been invited to OASIS
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Continue only if you expected this invitation. The next step
                confirms your email and shows the school or class you are
                joining before your account is completed.
              </p>

              <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-950">
                This extra confirmation protects your invitation from school
                email scanners that may inspect links automatically.
              </div>

              <a
                href={confirmationHref}
                rel="nofollow"
                className="mt-6 block w-full rounded-xl bg-slate-900 px-4 py-3 text-center font-semibold text-white transition hover:bg-slate-700"
              >
                Accept invitation securely
              </a>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-amber-700">
                Invitation unavailable
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                This invitation link is incomplete
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Ask your school administrator to resend the invitation from
                OASIS. A fresh email will replace the previous link.
              </p>
            </>
          )}

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Already have access?{" "}
            <Link href="/login" className="font-semibold text-slate-700 underline">
              Sign in to OASIS
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
