import { redirect } from "next/navigation";
import { getCurrentAccountContext } from "@/lib/supabase/current-workspace";
import DocumentUploader from "./DocumentUploader";

export default async function DocumentsPage() {
  const account = await getCurrentAccountContext();
  if (!account) redirect("/login");
  if (!account.workspaceId) redirect("/school-overview");
  return <DocumentUploader key={account.workspaceId} />;
}
