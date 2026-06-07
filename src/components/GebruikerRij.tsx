"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Wrench, Building2, Loader2, Mail, Trash2, Check, AlertCircle, Pencil, X } from "lucide-react";

type Rol = "beheerder" | "opdrachtgever" | "monteur";

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

export function GebruikerRij({
  id,
  naam,
  rol,
  isZelf,
}: {
  id: string;
  naam: string;
  rol: Rol;
  isZelf: boolean;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState<"" | "rol" | "mail" | "verwijder" | "naam">("");
  const [fout, setFout] = useState("");
  const [bericht, setBericht] = useState("");
  const [bewerken, setBewerken] = useState(false);
  const [nieuweNaam, setNieuweNaam] = useState(naam);

  async function hernoem() {
    const n = nieuweNaam.trim();
    if (!n || n === naam) {
      setBewerken(false);
      setNieuweNaam(naam);
      return;
    }
    setBezig("naam");
    setFout("");
    setBericht("");
    try {
      const res = await fetch(`/api/gebruikers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam: n }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? `Hernoemen mislukt (${res.status})`);
        return;
      }
      setBewerken(false);
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig("");
    }
  }

  async function wijzigRol(nieuw: string) {
    if (nieuw === rol) return;
    setBezig("rol");
    setFout("");
    setBericht("");
    try {
      const res = await fetch(`/api/gebruikers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: nieuw }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? `Rol wijzigen mislukt (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig("");
    }
  }

  async function stuurInlogmail() {
    setBezig("mail");
    setFout("");
    setBericht("");
    try {
      const res = await fetch(`/api/gebruikers/${id}/inlogmail`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? `Mail versturen mislukt (${res.status})`);
        return;
      }
      setBericht("Inlogmail opnieuw verstuurd.");
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig("");
    }
  }

  async function verwijder() {
    if (!window.confirm(`${naam} verwijderen? Dit account verliest direct toegang. Dit kun je niet ongedaan maken.`)) {
      return;
    }
    setBezig("verwijder");
    setFout("");
    setBericht("");
    try {
      const res = await fetch(`/api/gebruikers/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? `Verwijderen mislukt (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig("");
    }
  }

  const knop =
    "flex min-h-[40px] items-center justify-center gap-1.5 border-2 border-line bg-white px-3 text-sm font-bold text-ink disabled:opacity-50 cursor-pointer";

  return (
    <li className="flex flex-col gap-2 border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        {bewerken ? (
          <span className="flex flex-1 items-center gap-1.5">
            <input
              value={nieuweNaam}
              onChange={(e) => setNieuweNaam(e.target.value)}
              autoFocus
              aria-label={`Nieuwe naam voor ${naam}`}
              className="min-h-[40px] min-w-0 flex-1 border-2 border-ink bg-white px-2 text-base font-semibold text-ink focus-visible:outline-3 focus-visible:outline-accent"
            />
            <button
              type="button"
              onClick={hernoem}
              disabled={bezig !== ""}
              aria-label="Naam opslaan"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center border-2 border-primary text-primary disabled:opacity-50"
            >
              {bezig === "naam" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setBewerken(false);
                setNieuweNaam(naam);
              }}
              disabled={bezig !== ""}
              aria-label="Hernoemen annuleren"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center border-2 border-line text-ink-muted disabled:opacity-50"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-2 font-semibold text-ink">
            <span className="truncate">{naam || "(naam onbekend)"}</span>
            {isZelf && <span className="text-xs font-normal text-ink-muted">(jij)</span>}
            <button
              type="button"
              onClick={() => setBewerken(true)}
              aria-label={`${naam} hernoemen`}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-ink-muted hover:text-ink"
            >
              <Pencil size={14} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </span>
        )}
        {rol === "beheerder" ? (
          <span className="inline-flex items-center gap-1.5 border-[1.5px] border-ink px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-ink">
            <RolIcoon rol={rol} />
            {ROL_LABEL[rol]}
          </span>
        ) : (
          <label className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
            <RolIcoon rol={rol} />
            <select
              value={rol}
              disabled={bezig !== ""}
              onChange={(e) => wijzigRol(e.target.value)}
              className="min-h-[36px] border-2 border-line bg-white px-2 text-sm font-bold text-ink"
              aria-label={`Rol van ${naam}`}
            >
              <option value="monteur">Monteur</option>
              <option value="opdrachtgever">Opdrachtgever</option>
            </select>
          </label>
        )}
      </div>

      {!isZelf && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={stuurInlogmail} disabled={bezig !== ""} className={knop}>
            {bezig === "mail" ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Mail size={16} aria-hidden="true" />
            )}
            Inlogmail
          </button>
          <button
            type="button"
            onClick={verwijder}
            disabled={bezig !== ""}
            className={`${knop} border-urgent-rood text-urgent-rood`}
          >
            {bezig === "verwijder" ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 size={16} aria-hidden="true" />
            )}
            Verwijderen
          </button>
        </div>
      )}

      {bericht && (
        <p className="flex items-start gap-2 text-sm font-semibold text-success">
          <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {bericht}
        </p>
      )}
      {fout && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </li>
  );
}
