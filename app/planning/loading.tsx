export default function PlanningLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-12 sm:px-8">
      <div className="mx-auto max-w-7xl animate-pulse pt-10">
        <div className="h-48 rounded-3xl bg-white shadow-sm" />
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-56 rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      </div>
    </main>
  );
}
