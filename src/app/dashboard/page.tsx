import { db } from "@/lib/db";
import { teDoenTelling } from "@/lib/te-doen";
import { DashboardLijst } from "@/components/DashboardLijst";
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

      <DashboardLijst opdrachten={opdrachten} telling={telling} />
    </main>
  );
}
