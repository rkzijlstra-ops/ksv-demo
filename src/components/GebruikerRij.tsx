"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Wrench, Building2, Loader2, Mail, Trash2, Check, AlertCircle } from "lucide-react";

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
  const [bezig, setBezig] = useState<"" | "rol" | "mail" | "verwijder">("");
  const [fout, setFout] = useState("");
  const [bericht, setBericht] = useState("");

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
        <span className="font-semibold text-ink">
          {naam || "(naam onbekend)"}
          {isZelf && <span className="ml-2 text-xs font-normal text-ink-muted">(jij)</span>}
        </span>
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
