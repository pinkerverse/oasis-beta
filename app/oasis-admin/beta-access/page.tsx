import { redirect } from "next/navigation";

import OasisHeader from "@/app/components/OasisHeader";
import { getCurrentPlatformOwner } from "@/lib/platform-access";

import BetaAccessDashboard from "./BetaAccessDashboard";

export const dynamic = "force-dynamic";

export default async function BetaAccessPage() {
  const owner = await getCurrentPlatformOwner();

  if (!owner) redirect("/");

  return (
    <main className="min-h-screen bg-slate-50">
      <OasisHeader />
      <BetaAccessDashboard />
    </main>
  );
}

