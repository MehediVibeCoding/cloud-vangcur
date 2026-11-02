export default function PolicyLoading() {
  return (
    <div className="animate-section-reveal" aria-hidden="true">
      {/* ================= Policy Header Skeleton ================= */}
      <div className="relative mb-6 overflow-hidden rounded-[24px] border border-white/80 bg-gradient-to-b from-brand-bg/40 via-[#DCEBFD]/50 to-white/90 p-5 sm:p-7 shadow-sh2 backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between border-b border-ink/10 pb-3.5">
          <div className="h-7 w-20 animate-pulse rounded-full bg-white/80" />
          <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-full border border-brand-light/35 bg-white shadow-xs" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-6 w-3/4 animate-pulse rounded-lg bg-brand-bg/60 sm:h-7" />
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-brand-light/30" />
          </div>
        </div>
      </div>

      {/* ================= Policy Section 1 Skeleton ================= */}
      <div className="relative mb-5 overflow-hidden rounded-[20px] border border-white/80 bg-white/85 p-5 sm:p-6 shadow-xs backdrop-blur-md">
        <div className="mb-3.5 flex items-center gap-2.5 border-b border-ink/10 pb-2.5">
          <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-brand-bg" />
          <div className="h-4 w-48 animate-pulse rounded bg-brand-bg/50" />
        </div>
        <div className="space-y-2.5 pt-1">
          <div className="h-3.5 w-full animate-pulse rounded bg-surface-muted" />
          <div className="h-3.5 w-11/12 animate-pulse rounded bg-surface-muted" />
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>

      {/* ================= Policy Section 2 Skeleton ================= */}
      <div className="relative mb-5 overflow-hidden rounded-[20px] border border-white/80 bg-white/85 p-5 sm:p-6 shadow-xs backdrop-blur-md">
        <div className="mb-3.5 flex items-center gap-2.5 border-b border-ink/10 pb-2.5">
          <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-brand-bg" />
          <div className="h-4 w-56 animate-pulse rounded bg-brand-bg/50" />
        </div>
        <div className="space-y-3 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand-light/50" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-full animate-pulse rounded bg-surface-muted" />
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= Policy Section 3 Skeleton ================= */}
      <div className="relative mb-5 overflow-hidden rounded-[20px] border border-white/80 bg-white/85 p-5 sm:p-6 shadow-xs backdrop-blur-md">
        <div className="mb-3.5 flex items-center gap-2.5 border-b border-ink/10 pb-2.5">
          <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-brand-bg" />
          <div className="h-4 w-40 animate-pulse rounded bg-brand-bg/50" />
        </div>
        <div className="space-y-2.5 pt-1">
          <div className="h-3.5 w-full animate-pulse rounded bg-surface-muted" />
          <div className="h-3.5 w-5/6 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}
