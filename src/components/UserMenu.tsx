"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogOut, User, Info, Trash2, Users, IdCard, BookOpen, Menu, Sparkles, Hammer } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { WELKOM_WEG_KEY } from "@/lib/onboarding";
import { APP_VERSIE } from "@/lib/versie";

export function UserMenu({ email, isBeheerder = false }: { email: string; isBeheerder?: boolean }) {
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
    try {
      const supabase = createSupabaseBrowserClient();
      // scope "local": wist de sessie-cookies lokaal zonder de globale server-revoke (die kan hangen
      // bij een trage/verlopen sessie en zo het uitloggen blokkeren). De cookies zijn daarna leeg.
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Mocht signOut toch falen: we navigeren sowieso hard weg met gewiste cookies.
    }
    // Harde navigatie i.p.v. router.push: forceert een schone herlaad zodat de server de gewiste sessie
    // ziet (router.refresh kan in de PWA de oude staat vasthouden).
    window.location.assign("/login");
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
        className="flex h-10 w-10 cursor-pointer flex-col items-center justify-center gap-0.5 border-2 border-ink bg-surface text-ink transition-colors duration-150 hover:bg-line/50 focus-visible:outline-3 focus-visible:outline-accent"
      >
        <span className="font-mono text-sm font-extrabold leading-none">{initiaal}</span>
        <Menu size={12} strokeWidth={2.75} className="text-ink-muted" aria-hidden="true" />
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
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              // Welkom-markering wissen en naar de werkpool, waar het uitleg-blok dan weer verschijnt.
              try {
                localStorage.removeItem(WELKOM_WEG_KEY);
              } catch {
                // private mode e.d.: niets te wissen, gewoon doorgaan.
              }
              setOpen(false);
              // ?werkpool=1 zodat ook een beheerder de werkpool (met uitleg) ziet i.p.v. naar het dashboard te gaan.
              window.location.assign("/?werkpool=1");
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <Sparkles size={16} strokeWidth={2.5} className="text-ink-muted" aria-hidden="true" />
            Uitleg opnieuw tonen
          </button>
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
            <>
              <Link
                href="/?werkpool=1"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
              >
                <Hammer size={16} strokeWidth={2.5} className="text-ink-muted" aria-hidden="true" />
                Mijn werkpool
              </Link>
              <Link
                href="/gebruikers"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
              >
                <Users size={16} strokeWidth={2.5} className="text-ink-muted" aria-hidden="true" />
                Gebruikers
              </Link>
            </>
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
