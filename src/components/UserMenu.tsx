"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User, Info, Trash2, Users, IdCard, BookOpen } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { APP_VERSIE } from "@/lib/versie";

export function UserMenu({ email, isBeheerder = false }: { email: string; isBeheerder?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function buitenKlik(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", buitenKlik);
    return () => document.removeEventListener("mousedown", buitenKlik);
  }, [open]);

  async function uitloggen() {
    setBezig(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initiaal = email.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu voor ${email}`}
        className="flex h-10 w-10 cursor-pointer items-center justify-center border-2 border-ink bg-surface font-mono text-base font-extrabold text-ink transition-colors duration-150 hover:bg-line/50 focus-visible:outline-3 focus-visible:outline-accent"
      >
        {initiaal}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-64 border-2 border-ink bg-white p-2 shadow-md"
        >
          <p className="flex items-center gap-2 border-b border-line p-2 text-sm text-ink">
            <User size={16} className="shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="truncate" title={email}>{email}</span>
          </p>
          <Link
            href="/over"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <Info size={16} strokeWidth={2.5} className="text-ink-muted" aria-hidden="true" />
            Over de app
          </Link>
          <Link
            href="/handleiding"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <BookOpen size={16} strokeWidth={2.5} className="text-ink-muted" aria-hidden="true" />
            Handleiding
          </Link>
          <Link
            href="/mijn-gegevens"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <IdCard size={16} strokeWidth={2.5} className="text-ink-muted" aria-hidden="true" />
            Mijn gegevens
          </Link>
          {isBeheerder && (
            <Link
              href="/gebruikers"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
            >
              <Users size={16} strokeWidth={2.5} className="text-ink-muted" aria-hidden="true" />
              Gebruikers
            </Link>
          )}
          <Link
            href="/prullenbak"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <Trash2 size={16} strokeWidth={2.5} className="text-ink-muted" aria-hidden="true" />
            Prullenbak
          </Link>
          <button
            type="button"
            onClick={uitloggen}
            disabled={bezig}
            className="mt-1 flex w-full cursor-pointer items-center gap-2 border-2 border-urgent-rood px-3 py-2 text-sm font-extrabold uppercase tracking-[0.04em] text-urgent-rood transition-colors duration-150 hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
          >
            <LogOut size={16} strokeWidth={2.5} aria-hidden="true" />
            Uitloggen
          </button>
          <p className="mt-2 px-2 text-xs text-ink-muted">Versie {APP_VERSIE}</p>
        </div>
      )}
    </div>
  );
}
