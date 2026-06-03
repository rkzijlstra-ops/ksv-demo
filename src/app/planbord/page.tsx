import Link from "next/link";
import { db } from "@/lib/db";
import { PlanbordBord } from "@/components/PlanbordBord";
import { UserMenu } from "@/components/UserMenu";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function vandaagISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dag}`;
}

const DATUM_PATROON = /^\d{4}-\d{2}-\d{2}$/;

export default async function PlanbordPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const vandaag = vandaagISO();
  const ankerInit = week && DATUM_PATROON.test(week) ? week : vandaag;
  const opdrachten = await (await db()).getOpdrachtenVoorDashboard();

  return (
    <main className="mx-auto w-full max-w-[1040px] p-4 pb-24">
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">KSV / Agenda</p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Planbord</h1>
          </div>
          {user?.email && <UserMenu email={user.email} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <PlanbordBord opdrachten={opdrachten} ankerInit={ankerInit} vandaag={vandaag} />

      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
      >
        ← Naar het dashboard
      </Link>
    </main>
  );
}
