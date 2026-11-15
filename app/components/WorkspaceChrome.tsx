"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import OasisHeader from "@/app/components/OasisHeader";

type WorkspacePage =
  | "class"
  | "learner-intelligence"
  | "classroom-insights"
  | "class-attainment"
  | "planning";

const workspacePages: Record<string, WorkspacePage> = {
  "/": "class",
  "/learner-intelligence": "learner-intelligence",
  "/classroom-insights": "classroom-insights",
  "/class-attainment": "class-attainment",
  "/planning": "planning",
};

type HeaderContextEvent = CustomEvent<{ learnerIds?: string[] }>;

export default function WorkspaceChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const activePage = workspacePages[pathname];
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([]);

  useEffect(() => {
    const updateContext = (event: Event) => {
      const detail = (event as HeaderContextEvent).detail;
      setSelectedLearnerIds(
        Array.isArray(detail?.learnerIds)
          ? detail.learnerIds.filter((id): id is string => typeof id === "string")
          : []
      );
    };

    window.addEventListener("oasis:header-context", updateContext);
    return () => window.removeEventListener("oasis:header-context", updateContext);
  }, []);

  if (!activePage) return null;

  function openDashboardPanel(panel: string) {
    if (pathname === "/") {
      window.dispatchEvent(
        new CustomEvent("oasis:dashboard-panel", {
          detail: { panel },
        })
      );
      return;
    }

    const params = new URLSearchParams({ panel });
    if (selectedLearnerIds.length === 1) {
      params.set("learner", selectedLearnerIds[0]);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <OasisHeader
      activePage={activePage}
      selectedLearnerIds={selectedLearnerIds}
      onPTCNotes={() => openDashboardPanel("ptc")}
      onReportHelper={() => openDashboardPanel("report")}
      onUploadDocuments={() => openDashboardPanel("documents")}
      onReportFormats={() => openDashboardPanel("report-formats")}
      onSettings={() => openDashboardPanel("settings")}
      ptcNotesRequiresLearnerSelection={false}
    />
  );
}
