import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import { teDoenTelling } from "@/lib/te-doen";
import { DashboardLijst } from "@/components/DashboardLijst";
import { InschietZone } from "@/components/InschietZone";
import { UserMenu } from "@/components/UserMenu";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dbi = await db();
  const opdrachten = await dbi.getOpdrachtenVoorDashboard();
  const telling = teDoenTelling(opdrachten);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-24">
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
              KSV / Dashboard
            </p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Opdrachten</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {opdrachten.length} {opdrachten.length === 1 ? "opdracht" : "opdrachten"}
              {telling.aandacht > 0 && ` · ${telling.aandacht} ${telling.aandacht === 1 ? "vraagt" : "vragen"} aandacht`}
            </p>
          </div>
          {user?.email && <UserMenu email={user.email} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <Link
        href="/planbord"
        className="mb-4 inline-flex items-center gap-2 border-2 border-primary bg-white px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.04em] hover:bg-surface"
      >
        <CalendarDays size={16} strokeWidth={2.4} aria-hidden="true" />
        Naar het planbord
      </Link>

      <div className="mb-4">
        <InschietZone />
      </div>

      <DashboardLijst opdrachten={opdrachten} telling={telling} />
    </main>
  );
}
