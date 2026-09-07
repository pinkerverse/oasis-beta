"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useSchoolAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkSchoolAccess() {
      const response = await fetch("/api/account", { cache: "no-store" });
      const account = await response.json().catch(() => ({}));

      if (!cancelled && response.ok && account.isSchoolAdmin !== true) {
        router.replace("/");
      }
    }

    void checkSchoolAccess();
    return () => {
      cancelled = true;
    };
  }, [router]);
}
