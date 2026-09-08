"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AccountModal from "@/app/components/AccountModal";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

type HeaderPage =
  | "learner-intelligence"
  | "classroom-insights"
  | "class-attainment"
  | "school-overview"
  | null;

type OasisHeaderProps = {
  activePage?: HeaderPage;
  className?: string;
  selectedLearnerIds?: string[];
  accountName?: string;
  accountEmail?: string;
  onPTCNotes?: () => void;
  onReportHelper?: () => void;
  onAddObservation?: () => void;
  onTodaysFocus?: () => void;
  onSettings?: () => void;
  ptcNotesActive?: boolean;
  reportHelperActive?: boolean;
  addObservationActive?: boolean;
  todaysFocusActive?: boolean;
  settingsActive?: boolean;
};

function panelHref(panel: string, selectedLearnerIds: string[]) {
  const params = new URLSearchParams({ panel });

  if (selectedLearnerIds.length > 0) {
    params.set("learner", selectedLearnerIds[0]);
  }

  return `/?${params.toString()}`;
}

function iconClasses(active: boolean) {
  return `h-5 w-5 object-contain transition ${
    active ? "invert" : "group-active:invert"
  }`;
}

function actionButtonClasses(active: boolean) {
  return `group flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-sm font-semibold shadow-sm transition active:border-slate-900 active:bg-slate-900 active:text-white ${
    active
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
  }`;
}

function learnerToolButtonClasses(active: boolean) {
  return `hidden h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-sm font-semibold shadow-sm transition lg:flex disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none ${
    active
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
  }`;
}

export default function OasisHeader({
  activePage = null,
  className = "",
  selectedLearnerIds = [],
  accountName: suppliedAccountName = "",
  accountEmail: suppliedAccountEmail = "",
  onPTCNotes,
  onReportHelper,
  onAddObservation,
  onTodaysFocus,
  onSettings,
  ptcNotesActive = false,
  reportHelperActive = false,
  addObservationActive = false,
  todaysFocusActive = false,
  settingsActive = false,
}: OasisHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [loadedAccountName, setLoadedAccountName] = useState("");
  const [loadedAccountEmail, setLoadedAccountEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [accountRole, setAccountRole] = useState("");
  const [accountMode, setAccountMode] = useState("");
  const [temporaryOwner, setTemporaryOwner] = useState(false);
  const [hasClass, setHasClass] = useState(false);
  const [schoolAdmin, setSchoolAdmin] = useState(false);
  const [platformOwner, setPlatformOwner] = useState(false);
  const hasLearnerSelection = selectedLearnerIds.length > 0;
  const accountName = suppliedAccountName || loadedAccountName;
  const accountEmail = suppliedAccountEmail || loadedAccountEmail;

  useEffect(() => {
    let cancelled = false;

    async function loadHeaderAccount() {
      const supabase = createBrowserSupabaseClient();
      const [{ data }, accountResponse] = await Promise.all([
        supabase.auth.getUser(),
        fetch("/api/account", { cache: "no-store" }),
      ]);

      if (cancelled || !data.user) return;

      const metadata = data.user.user_metadata;
      const name =
        typeof metadata?.full_name === "string"
          ? metadata.full_name
          : typeof metadata?.name === "string"
            ? metadata.name
            : "";

      setLoadedAccountName(name);
      setLoadedAccountEmail(data.user.email ?? "");

      if (accountResponse.ok) {
        const account = await accountResponse.json().catch(() => ({}));
        if (cancelled) return;
        setSchoolName(
          typeof account.school?.name === "string" ? account.school.name : ""
        );
        setAccountRole(typeof account.role === "string" ? account.role : "");
        setAccountMode(
          typeof account.accountMode === "string" ? account.accountMode : ""
        );
        setTemporaryOwner(account.isTemporaryOwner === true);
        setHasClass(account.hasClass === true);
        setSchoolAdmin(account.isSchoolAdmin === true);
        setPlatformOwner(account.isPlatformOwner === true);
      }
    }

    void loadHeaderAccount();

    return () => {
      cancelled = true;
    };
  }, [suppliedAccountEmail, suppliedAccountName]);

  const nameParts = accountName.trim().split(/\s+/).filter(Boolean);
  const profileInitials = nameParts.length
    ? nameParts
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : accountEmail
      ? accountEmail.slice(0, 2).toUpperCase()
      : "ME";

  function runPanelAction(panel: string, callback?: () => void) {
    if (callback) {
      callback();
      return;
    }

    window.location.assign(panelHref(panel, selectedLearnerIds));
  }

  function openSettings() {
    setShowProfileMenu(false);

    if (onSettings) {
      onSettings();
      return;
    }

    setShowAccountModal(true);
  }

  const closeAccountModal = useCallback(() => {
    setShowAccountModal(false);
  }, []);

  const learnerIntelligenceActive = activePage === "learner-intelligence";
  const classroomInsightsActive = activePage === "classroom-insights";
  const classAttainmentActive = activePage === "class-attainment";
  const schoolOverviewActive = activePage === "school-overview";

  return (
    <header
      className={`sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-2 shadow-sm backdrop-blur sm:px-4 ${className}`}
    >
      <div className="mx-auto flex min-h-24 max-w-[1600px] items-center gap-2 sm:gap-4">
        <Link
          href={hasClass ? "/" : "/school-overview"}
          aria-label="Back to OASIS dashboard"
          className="relative h-14 w-20 shrink-0 sm:h-20 sm:w-28"
        >
          <Image
            src="/oasis-logo.png"
            alt="OASIS"
            fill
            sizes="112px"
            className="object-contain"
            priority
          />
        </Link>

        <div className="hidden h-11 w-px bg-slate-200 lg:block" />

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {hasClass && (
            <>
              <button
                type="button"
                onClick={() => runPanelAction("ptc", onPTCNotes)}
                disabled={!hasLearnerSelection}
                aria-label="PTC Notes"
                title={
                  hasLearnerSelection
                    ? "PTC Notes"
                    : "Select a learner to open PTC Notes"
                }
                className={learnerToolButtonClasses(ptcNotesActive)}
              >
                PTC Notes
              </button>

              <button
                type="button"
                onClick={() => runPanelAction("report", onReportHelper)}
                disabled={!hasLearnerSelection}
                aria-label="Report Helper"
                title={
                  hasLearnerSelection
                    ? "Report Helper"
                    : "Select a learner to open Report Helper"
                }
                className={learnerToolButtonClasses(reportHelperActive)}
              >
                Report Helper
              </button>

              <Link
                href="/learner-intelligence"
                aria-label="Learner Insight"
                aria-current={learnerIntelligenceActive ? "page" : undefined}
                title="Learner Insight"
                className={`${actionButtonClasses(learnerIntelligenceActive)} hidden min-[520px]:flex`}
              >
                <Image
                  src="/learner-intelligence-brain.png"
                  alt=""
                  width={128}
                  height={128}
                  className={iconClasses(learnerIntelligenceActive)}
                  aria-hidden="true"
                />
                <span className="hidden min-[1540px]:inline">
                  Learner Insight
                </span>
              </Link>

              <Link
                href="/classroom-insights"
                aria-label="Classroom Intelligence"
                aria-current={classroomInsightsActive ? "page" : undefined}
                title="Classroom Intelligence"
                className={`${actionButtonClasses(classroomInsightsActive)} hidden min-[520px]:flex`}
              >
                <Image
                  src="/classroom-insights-eye.png"
                  alt=""
                  width={128}
                  height={128}
                  className={iconClasses(classroomInsightsActive)}
                  aria-hidden="true"
                />
                <span className="hidden min-[1540px]:inline">
                  Classroom Intelligence
                </span>
              </Link>

              <Link
                href="/class-attainment"
                aria-label="Class Attainment"
                aria-current={classAttainmentActive ? "page" : undefined}
                title="Class Attainment"
                className={`${actionButtonClasses(classAttainmentActive)} hidden min-[520px]:flex`}
              >
                <Image
                  src="/class-attainment-icon.png"
                  alt=""
                  width={128}
                  height={128}
                  className={iconClasses(classAttainmentActive)}
                  aria-hidden="true"
                />
                <span className="hidden min-[1540px]:inline">
                  Class Attainment
                </span>
              </Link>

              <button
                type="button"
                onClick={() => runPanelAction("observation", onAddObservation)}
                aria-label="Add Observation"
                title="Add Observation"
                className={actionButtonClasses(addObservationActive)}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  +
                </span>
                <span className="hidden md:inline">Add Observation</span>
              </button>

              <button
                type="button"
                onClick={() => runPanelAction("focus", onTodaysFocus)}
                aria-label="Today’s Focus"
                title="Today’s Focus"
                className={`group flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-sm font-semibold shadow-sm transition active:border-slate-900 active:bg-slate-900 active:text-white ${
                  todaysFocusActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-indigo-200 bg-gradient-to-r from-cyan-50 to-indigo-100 text-slate-900 hover:border-indigo-300 hover:from-cyan-100 hover:to-indigo-100"
                }`}
              >
                <span aria-hidden="true">◎</span>
                <span className="hidden md:inline">Today’s Focus</span>
              </button>
            </>
          )}

          {hasClass && (
            <button
              type="button"
              onClick={openSettings}
              aria-label="Settings"
              title="Settings"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                settingsActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-900 active:text-white"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.6 3.8 10.2 2h3.6l.6 1.8 1.7 1 1.9-.4 1.8 3.1-1.3 1.4v2l1.3 1.4-1.8 3.1-1.9-.4-1.7 1-.6 1.8h-3.6L9.6 16l-1.7-1-1.9.4-1.8-3.1 1.3-1.4v-2L4.2 7.5 6 4.4l1.9.4 1.7-1Z"
                />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((current) => !current)}
              aria-expanded={showProfileMenu}
              aria-haspopup="menu"
              aria-label="Profile menu"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition ${
                showProfileMenu
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {profileInitials}
            </button>

            {showProfileMenu && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                <p className="truncate border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
                  {accountName || accountEmail || "My account"}
                </p>

                {schoolAdmin && (
                  <>
                    <Link
                      href="/school-overview"
                      role="menuitem"
                      className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 xl:hidden"
                    >
                      School Overview
                    </Link>
                    {hasClass && (
                      <Link
                        href="/"
                        role="menuitem"
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 xl:hidden"
                      >
                        My Class
                      </Link>
                    )}
                  </>
                )}

                {hasClass && (
                  <div className="border-b border-slate-100 pb-1 min-[520px]:hidden">
                    <Link
                      href="/learner-intelligence"
                      role="menuitem"
                      className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Learner Insight
                    </Link>
                    <Link
                      href="/classroom-insights"
                      role="menuitem"
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Classroom Intelligence
                    </Link>
                    <Link
                      href="/class-attainment"
                      role="menuitem"
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Class Attainment
                    </Link>
                  </div>
                )}

                {platformOwner && (
                  <Link
                    href="/oasis-admin/beta-access"
                    role="menuitem"
                    className="mt-1 block w-full rounded-xl bg-gradient-to-r from-cyan-50 to-indigo-50 px-3 py-2 text-left text-sm font-semibold text-cyan-900 hover:from-cyan-100 hover:to-indigo-100"
                  >
                    OASIS Beta Access
                  </Link>
                )}

                {hasClass ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      openSettings();
                    }}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    My account
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openSettings}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    My account
                  </button>
                )}

                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    role="menuitem"
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>

          {schoolAdmin && (
            <>
              <div className="mx-1 hidden h-8 w-px bg-slate-200 xl:block" />
              <nav
                aria-label="Workspace view"
                className="hidden shrink-0 items-center whitespace-nowrap rounded-xl bg-slate-100 p-1 xl:flex"
              >
                <Link
                  href="/school-overview"
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    schoolOverviewActive
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  School Overview
                </Link>
                {hasClass && (
                  <Link
                    href="/"
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      !schoolOverviewActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    My Class
                  </Link>
                )}
              </nav>
            </>
          )}
        </div>
      </div>
      {showAccountModal && (
        <AccountModal
          accountEmail={accountEmail}
          accountMode={accountMode}
          accountName={accountName}
          accountRole={accountRole}
          hasClass={hasClass}
          isPlatformOwner={platformOwner}
          isSchoolAdmin={schoolAdmin}
          isTemporaryOwner={temporaryOwner}
          onClose={closeAccountModal}
          onProfileSaved={({ email, name }) => {
            setLoadedAccountEmail(email);
            setLoadedAccountName(name);
          }}
          schoolName={schoolName}
        />
      )}
    </header>
  );
}
