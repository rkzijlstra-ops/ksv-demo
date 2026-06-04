import { Shield, Wrench, Building2 } from "lucide-react";
import { db, type Rol } from "@/lib/db";
import { UitnodigForm } from "@/components/UitnodigForm";
import { UserMenu } from "@/components/UserMenu";
import { vereisRol } from "@/lib/toegang";

export const dynamic = "force-dynamic";

const ROL_LABEL: Record<Rol, string> = {
  beheerder: "Beheerder",
  opdrachtgever: "Opdrachtgever",
  monteur: "Monteur",
};

function RolIcoon({ rol }: { rol: Rol }) {
  if (rol === "beheerder") return <Shield size={14} aria-hidden="true" />;
  if (rol === "opdrachtgever") return <Building2 size={14} aria-hidden="true" />;
  return <Wrench size={14} aria-hidden="true" />;
}

export default async function MensenPage() {
  const { email } = await vereisRol(["beheerder"]);
  const dbi = await db();
  const profielen = await dbi.getProfielen();

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Beheer / Mensen</p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Mensen</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Nodig monteurs en opdrachtgevers uit. Ze krijgen een inloglink, geen wachtwoord.
            </p>
          </div>
          {email && <UserMenu email={email} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <UitnodigForm />

      <section className="mt-6">
        <h2 className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
          Accounts ({profielen.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {profielen.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 border border-line bg-white p-3"
            >
              <span className="font-semibold text-ink">{p.naam || "(naam onbekend)"}</span>
              <span className="inline-flex items-center gap-1.5 border-[1.5px] border-ink px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-ink">
                <RolIcoon rol={p.rol} />
                {ROL_LABEL[p.rol]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
