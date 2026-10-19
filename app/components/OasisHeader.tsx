"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import AccountModal from "@/app/components/AccountModal";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

type HeaderPage =
  | "learner-intelligence"
  | "classroom-insights"
  | "class-attainment"
  | "school-overview"
  | "planning"
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
  onTeacherNote?: () => void;
  onTodaysFocus?: () => void;
  onSettings?: () => void;
  ptcNotesRequiresLearnerSelection?: boolean;
  ptcNotesActive?: boolean;
  reportHelperActive?: boolean;
  addObservationActive?: boolean;
  teacherNoteActive?: boolean;
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
  return `group flex h-10 w-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-0 text-sm font-semibold shadow-sm transition active:border-slate-900 active:bg-slate-900 active:text-white sm:h-11 sm:w-11 xl:w-auto xl:px-3 ${
    active
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
  }`;
}

const menuItemClasses = "block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-600 disabled:cursor-not-allowed disabled:text-slate-400";

export default function OasisHeader({
  activePage = null,
  className = "",
  selectedLearnerIds = [],
  accountName: suppliedAccountName = "",
  accountEmail: suppliedAccountEmail = "",
  onPTCNotes,
  onReportHelper,
  onAddObservation,
  onTeacherNote,
  onTodaysFocus,
  onSettings,
  ptcNotesRequiresLearnerSelection = true,
  ptcNotesActive = false,
  reportHelperActive = false,
  addObservationActive = false,
  teacherNoteActive = false,
  todaysFocusActive = false,
  settingsActive = false,
}: OasisHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const toolsMenuId = useId();
  const toolsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (!showToolsMenu && !showProfileMenu) return;
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!toolsRef.current?.contains(event.target)) setShowToolsMenu(false);
      if (!profileRef.current?.contains(event.target)) setShowProfileMenu(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showToolsMenu) toolsButtonRef.current?.focus();
      else if (showProfileMenu) profileButtonRef.current?.focus();
      setShowToolsMenu(false);
      setShowProfileMenu(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showToolsMenu, showProfileMenu]);

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
    setShowToolsMenu(false);
    setShowProfileMenu(false);
    if (callback) {
      callback();
      return;
    }

    window.location.assign(panelHref(panel, selectedLearnerIds));
  }

  function openSettings() {
    setShowToolsMenu(false);
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
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center gap-1 sm:min-h-24 sm:gap-4">
        <Link
          href={hasClass ? "/" : "/school-overview"}
          aria-label="Back to OASIS dashboard"
          className="relative h-10 w-12 shrink-0 min-[420px]:h-12 min-[420px]:w-16 sm:h-20 sm:w-28"
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

        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-1.5">
          {hasClass && (
            <>
              <Link
                href="/planning"
                aria-label="Weekly planning"
                title="Weekly planning"
                aria-current={activePage === "planning" ? "page" : undefined}
                className={actionButtonClasses(activePage === "planning")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 10h18M7 14h3m4 0h3M7 17h3" /></svg>
                <span className="hidden xl:inline">Planning</span>
              </Link>

              <Link
                href="/learner-intelligence"
                aria-label="Learner Insight"
                aria-current={learnerIntelligenceActive ? "page" : undefined}
                title="Learner Insight"
                className={`${actionButtonClasses(learnerIntelligenceActive)} hidden sm:flex`}
              >
                <Image
                  src="/learner-intelligence-brain.png"
                  alt=""
                  width={128}
                  height={128}
                  className={iconClasses(learnerIntelligenceActive)}
                  aria-hidden="true"
                />
              </Link>

              <Link
                href="/classroom-insights"
                aria-label="Classroom Intelligence"
                aria-current={classroomInsightsActive ? "page" : undefined}
                title="Classroom Intelligence"
                className={`${actionButtonClasses(classroomInsightsActive)} hidden sm:flex`}
              >
                <Image
                  src="/classroom-insights-eye.png"
                  alt=""
                  width={128}
                  height={128}
                  className={iconClasses(classroomInsightsActive)}
                  aria-hidden="true"
                />
              </Link>

              <Link
                href="/class-attainment"
                aria-label="Class Attainment"
                aria-current={classAttainmentActive ? "page" : undefined}
                title="Class Attainment"
                className={`${actionButtonClasses(classAttainmentActive)} hidden sm:flex`}
              >
                <Image
                  src="/class-attainment-icon.png"
                  alt=""
                  width={128}
                  height={128}
                  className={iconClasses(classAttainmentActive)}
                  aria-hidden="true"
                />
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
                <span className="hidden xl:inline">Add Observation</span>
              </button>

              <button
                type="button"
                onClick={() => runPanelAction("teacher-note", onTeacherNote)}
                aria-label="Teacher Note"
                title="Private Teacher Note"
                className={`${actionButtonClasses(teacherNoteActive)} hidden sm:flex`}
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
                    d="M6 4.5h9.5A2.5 2.5 0 0 1 18 7v12.5H8A2 2 0 0 1 6 17.5v-13Z"
                  />
                  <path strokeLinecap="round" d="M9 9h6M9 12.5h4" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.2 4.8V3.6a1.8 1.8 0 0 1 3.6 0v1.2M15.3 4.8h5.4v4.5h-5.4z"
                  />
                </svg>
                <span className="hidden xl:inline">Teacher Note</span>
              </button>

              <button
                type="button"
                onClick={() => runPanelAction("focus", onTodaysFocus)}
                aria-label="Today’s Focus"
                title="Today’s Focus"
                className={`group flex h-10 w-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-0 text-sm font-semibold shadow-sm transition active:border-slate-900 active:bg-slate-900 active:text-white sm:h-11 sm:w-11 xl:w-auto xl:px-3 ${
                  todaysFocusActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-indigo-200 bg-gradient-to-r from-cyan-50 to-indigo-100 text-slate-900 hover:border-indigo-300 hover:from-cyan-100 hover:to-indigo-100"
                }`}
              >
                <span aria-hidden="true">◎</span>
                <span className="hidden xl:inline">Today’s Focus</span>
              </button>
            </>
          )}

          {hasClass && (
            <div ref={toolsRef} className="relative">
              <button ref={toolsButtonRef} type="button" aria-label="Tools" title="Tools" aria-expanded={showToolsMenu} aria-controls={toolsMenuId}
                onClick={() => { setShowToolsMenu((current) => !current); setShowProfileMenu(false); }}
                className={actionButtonClasses(showToolsMenu || ptcNotesActive || reportHelperActive || settingsActive)}>
                <span aria-hidden="true" className="text-xl leading-none">⋯</span>
                <span className="hidden xl:inline">Tools</span>
              </button>
              {showToolsMenu && <nav id={toolsMenuId} aria-label="Class tools" className="absolute right-0 top-full mt-2 max-h-[70dvh] w-64 max-w-[calc(100vw-5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <Link href="/documents" onClick={() => setShowToolsMenu(false)} className={menuItemClasses}>Upload documents</Link>
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Reports</p>
                <button type="button" onClick={() => runPanelAction("ptc", onPTCNotes)} disabled={ptcNotesRequiresLearnerSelection && !hasLearnerSelection} className={menuItemClasses}>PTC Notes</button>
                <button type="button" onClick={() => runPanelAction("report", onReportHelper)} disabled={!hasLearnerSelection} className={menuItemClasses}>Report Helper</button>
                {!hasLearnerSelection && <p className="px-3 pb-2 text-xs leading-5 text-slate-500">{ptcNotesRequiresLearnerSelection ? "Select a learner in My Class to use these report tools." : "Select a learner in My Class to use Report Helper."}</p>}
                <div className="mt-1 border-t border-slate-100 pt-1 sm:hidden">
                  <button type="button" onClick={() => runPanelAction("teacher-note", onTeacherNote)} className={menuItemClasses}>Teacher Note</button>
                  <Link href="/learner-intelligence" aria-current={learnerIntelligenceActive ? "page" : undefined} onClick={() => setShowToolsMenu(false)} className={menuItemClasses}>Learner Insight</Link>
                  <Link href="/classroom-insights" aria-current={classroomInsightsActive ? "page" : undefined} onClick={() => setShowToolsMenu(false)} className={menuItemClasses}>Classroom Intelligence</Link>
                  <Link href="/class-attainment" aria-current={classAttainmentActive ? "page" : undefined} onClick={() => setShowToolsMenu(false)} className={menuItemClasses}>Class Attainment</Link>
                </div>
                <div className="mt-1 border-t border-slate-100 pt-1"><button type="button" onClick={openSettings} className={menuItemClasses}>Settings</button></div>
              </nav>}
            </div>
          )}

          <div ref={profileRef} className="relative">
            <button
              ref={profileButtonRef}
              type="button"
              onClick={() => { setShowProfileMenu((current) => !current); setShowToolsMenu(false); }}
              aria-expanded={showProfileMenu}
              aria-haspopup="menu"
              aria-label="Profile menu"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition sm:h-11 sm:w-11 ${
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
                className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                <p className="truncate border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
                  {accountName || accountEmail || "My account"}
                </p>

                {hasClass && (
                  <Link href="/planning" role="menuitem" onClick={() => setShowProfileMenu(false)} className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Weekly planning
                  </Link>
                )}

                {schoolAdmin && <Link href="/school-overview" role="menuitem" aria-current={schoolOverviewActive ? "page" : undefined} onClick={() => setShowProfileMenu(false)} className={menuItemClasses}>School Overview</Link>}
                {hasClass && <Link href="/" role="menuitem" onClick={() => setShowProfileMenu(false)} className={menuItemClasses}>My Class</Link>}

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
