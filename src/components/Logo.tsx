import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-ink-800 ring-1 ring-accent/40">
        <svg viewBox="0 0 32 32" className="h-6 w-6">
          <path d="M16 3 L28 10 V22 L16 29 L4 22 V10 Z" fill="none" stroke="#7dffb3" strokeWidth="1.8" />
          <path d="M16 8 L22 20 H10 Z" fill="#d4ff3f" />
        </svg>
      </span>
      {compact ? null : (
        <span>
          <span className="block text-sm font-bold tracking-[0.18em]">STANDLEO</span>
          <span className="block text-[10px] uppercase tracking-[0.32em] text-accent">Lite Arena</span>
        </span>
      )}
    </Link>
  );
}
