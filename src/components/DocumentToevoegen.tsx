"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertCircle } from "lucide-react";

export function DocumentToevoegen({ opdrachtId }: { opdrachtId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setBezig(true);
    setFout("");
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch(`/api/opdrachten/${opdrachtId}/documenten`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? `Toevoegen mislukt (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        hidden
        onChange={handleFiles}
        disabled={bezig}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={bezig}
        className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
        )}
        Document toevoegen
      </button>
      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
