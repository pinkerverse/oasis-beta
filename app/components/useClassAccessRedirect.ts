"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useClassAccessRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkClassAccess() {
      const response = await fetch("/api/account", { cache: "no-store" });
      const account = await response.json().catch(() => ({}));

      if (
        !cancelled &&
        response.ok &&
        account.isSchoolAdmin === true &&
        account.hasClass !== true
      ) {
        router.replace("/school-overview");
      }
    }

    void checkClassAccess();
    return () => {
      cancelled = true;
    };
  }, [router]);
}
