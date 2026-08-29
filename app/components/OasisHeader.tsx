"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

type HeaderPage =
  | "learner-intelligence"
  | "classroom-insights"
  | "class-attainment"
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
  return `group flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2.5 text-sm font-medium shadow-sm transition active:border-slate-900 active:bg-slate-900 active:text-white ${
    active
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
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
  const [loadedAccountName, setLoadedAccountName] = useState("");
  const [loadedAccountEmail, setLoadedAccountEmail] = useState("");
  const hasLearnerSelection = selectedLearnerIds.length > 0;
  const accountName = suppliedAccountName || loadedAccountName;
  const accountEmail = suppliedAccountEmail || loadedAccountEmail;

  useEffect(() => {
    if (suppliedAccountName || suppliedAccountEmail) return;

    let cancelled = false;

    async function loadHeaderAccount() {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getUser();

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

  const learnerIntelligenceActive = activePage === "learner-intelligence";
  const classroomInsightsActive = activePage === "classroom-insights";
  const classAttainmentActive = activePage === "class-attainment";

  return (
    <header
      className={`sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-2 shadow-sm backdrop-blur sm:px-8 ${className}`}
    >
      <div className="mx-auto flex min-h-24 max-w-7xl items-center gap-2 sm:gap-5">
        <Link
          href="/"
          aria-label="Back to OASIS dashboard"
          className="relative h-16 w-24 shrink-0 sm:h-20 sm:w-28"
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
          <button
            type="button"
            onClick={() => runPanelAction("ptc", onPTCNotes)}
            disabled={!hasLearnerSelection}
            className={`hidden whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 lg:block ${
              ptcNotesActive
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            PTC Notes
          </button>

          <button
            type="button"
            onClick={() => runPanelAction("report", onReportHelper)}
            disabled={!hasLearnerSelection}
            className={`hidden whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 lg:block ${
              reportHelperActive
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Report Helper
          </button>

          <Link
            href="/learner-intelligence"
            aria-label="Learner Intelligence"
            aria-current={learnerIntelligenceActive ? "page" : undefined}
            title="Learner Intelligence"
            className={actionButtonClasses(learnerIntelligenceActive)}
          >
            <Image
              src="/learner-intelligence-brain.png"
              alt=""
              width={128}
              height={128}
              className={iconClasses(learnerIntelligenceActive)}
              aria-hidden="true"
            />
            <span className="hidden min-[1320px]:inline">Learner Intelligence</span>
          </Link>

          <Link
            href="/classroom-insights"
            aria-label="Classroom Insights"
            aria-current={classroomInsightsActive ? "page" : undefined}
            title="Classroom Insights"
            className={actionButtonClasses(classroomInsightsActive)}
          >
            <Image
              src="/classroom-insights-eye.png"
              alt=""
              width={128}
              height={128}
              className={iconClasses(classroomInsightsActive)}
              aria-hidden="true"
            />
            <span className="hidden min-[1320px]:inline">Classroom Insights</span>
          </Link>

          <Link
            href="/class-attainment"
            aria-label="Class Attainment"
            aria-current={classAttainmentActive ? "page" : undefined}
            title="Class Attainment"
            className={actionButtonClasses(classAttainmentActive)}
          >
            <Image
              src="/class-attainment-icon.png"
              alt=""
              width={128}
              height={128}
              className={iconClasses(classAttainmentActive)}
              aria-hidden="true"
            />
            <span className="hidden min-[1320px]:inline">Class Attainment</span>
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
            <span className="hidden sm:inline">Add Observation</span>
          </button>

          <button
            type="button"
            onClick={() => runPanelAction("focus", onTodaysFocus)}
            aria-label="Today's Focus"
            title="Today's Focus"
            className={`group flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2.5 text-sm font-medium shadow-sm transition active:border-slate-900 active:bg-slate-900 active:text-white ${
              todaysFocusActive
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-indigo-200 bg-gradient-to-r from-cyan-50 to-indigo-100 text-slate-900 hover:from-cyan-100 hover:to-indigo-100"
            }`}
          >
            <span aria-hidden="true">◎</span>
            <span className="hidden sm:inline">Today&apos;s Focus</span>
          </button>

          <button
            type="button"
            onClick={() => runPanelAction("settings", onSettings)}
            aria-label="Settings"
            title="Settings"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              settingsActive
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-900 active:text-white"
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

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((current) => !current)}
              aria-expanded={showProfileMenu}
              aria-haspopup="menu"
              aria-label="Profile menu"
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition ${
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

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowProfileMenu(false);
                    runPanelAction("settings", onSettings);
                  }}
                  className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  My account
                </button>

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
    </header>
  );
}
