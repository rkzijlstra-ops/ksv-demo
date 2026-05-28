"use client";

import { useState } from "react";
import { Camera, Loader2, X, AlertCircle } from "lucide-react";
import { compressImage } from "@/lib/foto-compress";

export function FotoMaken({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setBezig(true);
    setFout("");
    try {
      const nieuwe: string[] = [];
      for (const file of files) {
        const blob = await compressImage(file);
        const fd = new FormData();
        fd.append("foto", blob, "foto.jpg");
        const res = await fetch("/api/upload-foto", { method: "POST", body: fd });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Upload mislukt (${res.status})`);
        nieuwe.push(body.url);
      }
      onChange([...urls, ...nieuwe]);
    } catch (err) {
      setFout((err as Error).message);
    } finally {
      setBezig(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label className="flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface px-4 py-3 text-base font-semibold text-ink transition-colors duration-150 hover:bg-line/40 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={handleFiles}
          disabled={bezig}
        />
        {bezig ? (
          <>
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
            Foto&apos;s uploaden…
          </>
        ) : (
          <>
            <Camera size={22} strokeWidth={2.5} aria-hidden="true" />
            Foto maken
          </>
        )}
      </label>

      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}

      {urls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {urls.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Gemaakte foto"
                className="aspect-square w-full rounded-lg border border-line object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(urls.filter((u) => u !== url))}
                aria-label="Foto verwijderen"
                className="absolute -right-2 -top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-urgent-rood text-white shadow"
              >
                <X size={16} strokeWidth={3} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
