export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[320px]" role="status" aria-live="polite">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500 mt-3">{label}</p>
      </div>
    </div>
  );
}

export function BusyOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/45 flex items-center justify-center" role="status" aria-live="polite">
      <div className="bg-white rounded-xl px-6 py-5 shadow-xl text-center min-w-[220px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-800 mt-3">{label}</p>
      </div>
    </div>
  );
}
