import { NextResponse } from "next/server";

import { setCurrentWorkspace } from "@/lib/supabase/current-workspace";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "This request could not be verified." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const workspaceId =
    typeof body?.workspaceId === "string" ? body.workspaceId.trim() : "";

  if (!workspaceId || !(await setCurrentWorkspace(workspaceId))) {
    return NextResponse.json(
      { error: "You do not have access to that class." },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true });
}
