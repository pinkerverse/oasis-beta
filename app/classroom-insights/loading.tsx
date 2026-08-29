export default function ClassroomInsightsLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-24 rounded-3xl bg-white" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-white" />
          ))}
        </div>
        <div className="mt-6 h-96 rounded-3xl bg-white" />
      </div>
    </main>
  );
}
