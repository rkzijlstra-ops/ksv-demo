import { UserMenu } from "@/components/UserMenu";
import { TerugKnop } from "@/components/TerugKnop";
import { MijnGegevensForm } from "@/components/MijnGegevensForm";
import { vereisRol } from "@/lib/toegang";

export const dynamic = "force-dynamic";

export default async function MijnGegevensPage() {
  const { email, profiel } = await vereisRol(["monteur", "beheerder", "opdrachtgever"]);
  const isMonteur = profiel.rol === "monteur";
  const terugHref = isMonteur ? "/" : "/dashboard";
  const terugLabel = isMonteur ? "Werkpool" : "Dashboard";

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <TerugKnop href={terugHref} label={terugLabel} />
      </div>
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Account / Mijn gegevens</p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Mijn gegevens</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Je afzender-gegevens voor op het opleverrapport.
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <section className="border-2 border-t-0 border-line bg-white px-5 py-5">
        <MijnGegevensForm
          naam={profiel.naam}
          bedrijfsnaam={profiel.bedrijfsnaam}
          telefoon={profiel.telefoon}
          contactEmail={profiel.contact_email}
          isMonteur={isMonteur}
          smsWerkKritiek={profiel.sms_werk_kritiek}
          smsOverig={profiel.sms_overig}
          waarschuwKlantZicht={profiel.waarschuw_klant_zicht}
        />
      </section>
    </main>
  );
}
