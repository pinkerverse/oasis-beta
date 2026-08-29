"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import OasisEmbeddedOverlay, {
  type OasisEmbeddedOverlayKind,
} from "@/app/components/OasisEmbeddedOverlay";
import OasisHeader from "@/app/components/OasisHeader";

type EditableTerm = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
};

export default function AcademicYearSettingsPage() {
  const router = useRouter();
  const [academicYearName, setAcademicYearName] = useState("");
  const [academicYearStart, setAcademicYearStart] = useState("");
  const [academicYearEnd, setAcademicYearEnd] = useState("");
  const [terms, setTerms] = useState<EditableTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [headerOverlay, setHeaderOverlay] =
    useState<OasisEmbeddedOverlayKind | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAcademicYear() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/onboarding/academic-year",
          { cache: "no-store" }
        );
        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.error || "Could not load the academic year."
          );
        }

        if (cancelled) return;

        setAcademicYearName(result.academicYear?.name ?? "");
        setAcademicYearStart(
          result.academicYear?.start_date ?? ""
        );
        setAcademicYearEnd(result.academicYear?.end_date ?? "");
        setTerms(
          Array.isArray(result.terms)
            ? result.terms.map(
                (term: {
                  id: string;
                  name: string;
                  start_date: string;
                  end_date: string;
                }) => ({
                  id: term.id,
                  name: term.name,
                  startDate: term.start_date,
                  endDate: term.end_date,
                })
              )
            : []
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load the academic year."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAcademicYear();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function updateTerm(
    index: number,
    field: "name" | "startDate" | "endDate",
    value: string
  ) {
    setTerms((current) =>
      current.map((term, termIndex) =>
        termIndex === index ? { ...term, [field]: value } : term
      )
    );
    clearFeedback();
  }

  function addTerm() {
    setTerms((current) => [
      ...current,
      {
        name: `Term ${current.length + 1}`,
        startDate: "",
        endDate: "",
      },
    ]);
    clearFeedback();
  }

  async function saveAcademicYear() {
    if (
      !academicYearName.trim() ||
      !academicYearStart ||
      !academicYearEnd ||
      terms.length === 0
    ) {
      setError("Complete the academic year and at least one term.");
      return;
    }

    if (academicYearStart > academicYearEnd) {
      setError(
        "The academic year start date must be before its end date."
      );
      return;
    }

    const invalidTerm = terms.find(
      (term) =>
        !term.name.trim() ||
        !term.startDate ||
        !term.endDate ||
        term.startDate > term.endDate ||
        term.startDate < academicYearStart ||
        term.endDate > academicYearEnd
    );

    if (invalidTerm) {
      setError(
        `${invalidTerm.name || "Each term"} must have valid dates within the academic year.`
      );
      return;
    }

    try {
      setSaving(true);
      clearFeedback();

      const response = await fetch(
        "/api/onboarding/academic-year",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: academicYearName.trim(),
            startDate: academicYearStart,
            endDate: academicYearEnd,
            terms,
          }),
        }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Could not save the academic year."
        );
      }

      setMessage("Academic year and term dates saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the academic year."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 pb-12 sm:px-8">
      <OasisHeader
        className="-mx-4 sm:-mx-8"
        settingsActive
        onAddObservation={() => setHeaderOverlay("observation")}
        onTodaysFocus={() => setHeaderOverlay("focus")}
        addObservationActive={headerOverlay === "observation"}
        todaysFocusActive={headerOverlay === "focus"}
      />

      <OasisEmbeddedOverlay
        kind={headerOverlay}
        onClose={() => setHeaderOverlay(null)}
      />

      <div className="mx-auto max-w-6xl pt-10">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-6 py-8 sm:px-8">
            <p className="text-sm font-semibold text-cyan-700">
              School calendar
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Academic year & terms
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Update dates when your school calendar changes. OASIS will use the revised terms throughout the app.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {loading ? (
              <div className="space-y-4">
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            ) : error && !academicYearName ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Current calendar
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Changes apply as soon as you save them.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addTerm}
                    className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    + Add term
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <label className="text-sm font-semibold text-slate-700">
                    Academic year name
                    <input
                      value={academicYearName}
                      onChange={(event) => {
                        setAcademicYearName(event.target.value);
                        clearFeedback();
                      }}
                      placeholder="2026–2027"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Year starts
                    <input
                      type="date"
                      value={academicYearStart}
                      onChange={(event) => {
                        setAcademicYearStart(event.target.value);
                        clearFeedback();
                      }}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-700">
                    Year ends
                    <input
                      type="date"
                      value={academicYearEnd}
                      onChange={(event) => {
                        setAcademicYearEnd(event.target.value);
                        clearFeedback();
                      }}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal text-slate-900"
                    />
                  </label>
                </div>

                <div className="mt-6 space-y-4">
                  {terms.map((term, index) => (
                    <div
                      key={term.id ?? `new-term-${index}`}
                      className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3"
                    >
                      <label className="text-xs font-semibold text-slate-600">
                        Term name
                        <input
                          value={term.name}
                          onChange={(event) =>
                            updateTerm(index, "name", event.target.value)
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal text-slate-900"
                        />
                      </label>

                      <label className="text-xs font-semibold text-slate-600">
                        Starts
                        <input
                          type="date"
                          value={term.startDate}
                          min={academicYearStart || undefined}
                          max={academicYearEnd || undefined}
                          onChange={(event) =>
                            updateTerm(
                              index,
                              "startDate",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal text-slate-900"
                        />
                      </label>

                      <label className="text-xs font-semibold text-slate-600">
                        Ends
                        <input
                          type="date"
                          value={term.endDate}
                          min={academicYearStart || undefined}
                          max={academicYearEnd || undefined}
                          onChange={(event) =>
                            updateTerm(
                              index,
                              "endDate",
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal text-slate-900"
                        />
                      </label>
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                {message && (
                  <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {message}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
                  <Link
                    href="/?panel=settings"
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Back to Settings
                  </Link>

                  <button
                    type="button"
                    onClick={() => void saveAcademicYear()}
                    disabled={saving}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving
                      ? "Saving calendar…"
                      : "Save academic year & terms"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
