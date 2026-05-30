"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Camera, Image as ImageIcon, Loader2, X, AlertCircle, CloudOff } from "lucide-react";
import { compressImage } from "@/lib/foto-compress";
import { bewaarFotoBlob } from "@/lib/queue";
import { useQuota } from "@/lib/use-quota";

const LOCAL_PREFIX = "local:";

/**
 * Geeft een lokale foto-referentie terug uit `urls` als `local:<id>`-string,
 * of `null` als het een normale URL is.
 */
function lokaalId(url: string): string | null {
  return url.startsWith(LOCAL_PREFIX) ? url.slice(LOCAL_PREFIX.length) : null;
}

export function FotoMaken({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const { niveau: quotaNiveau } = useQuota();
  const quotaVol = quotaNiveau === "vol";
  // Mapping van local:<id> naar een object-URL voor preview tijdens deze sessie.
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  // Object-URLs opruimen bij unmount of bij vervangen.
  useEffect(() => {
    return () => {
      Object.values(blobUrls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [blobUrls]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setBezig(true);
    setFout("");
    try {
      const nieuwe: string[] = [];
      const nieuweBlobUrls: Record<string, string> = {};
      for (const file of files) {
        const blob = await compressImage(file);
        if (navigator.onLine) {
          // Online: direct uploaden, krijg echte Supabase-URL terug.
          const fd = new FormData();
          fd.append("foto", blob, "foto.jpg");
          const res = await fetch("/api/upload-foto", { method: "POST", body: fd });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error ?? `Upload mislukt (${res.status})`);
          nieuwe.push(body.url);
        } else {
          // Offline: bewaar blob in IndexedDB, gebruik local:-prefix voor de UI.
          const lokaal = await bewaarFotoBlob(blob, "image/jpeg", "foto.jpg");
          const ref = `${LOCAL_PREFIX}${lokaal}`;
          nieuwe.push(ref);
          nieuweBlobUrls[ref] = URL.createObjectURL(blob);
        }
      }
      onChange([...urls, ...nieuwe]);
      if (Object.keys(nieuweBlobUrls).length > 0) {
        setBlobUrls((prev) => ({ ...prev, ...nieuweBlobUrls }));
      }
    } catch (err) {
      setFout((err as Error).message);
    } finally {
      setBezig(false);
      e.target.value = "";
    }
  }

  function verwijder(url: string) {
    onChange(urls.filter((u) => u !== url));
    if (url in blobUrls) {
      URL.revokeObjectURL(blobUrls[url]);
      setBlobUrls((prev) => {
        const cp = { ...prev };
        delete cp[url];
        return cp;
      });
    }
  }

  return (
    <div>
      {bezig ? (
        <div className="flex min-h-[56px] items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-4 py-3 text-base font-semibold text-ink">
          <Loader2 size={22} className="animate-spin" aria-hidden="true" />
          Foto&apos;s verwerken…
        </div>
      ) : (
        <div className="flex gap-2">
          <label
            className={`flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-3 py-3 text-base font-semibold text-ink transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${
              quotaVol ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-line/40"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              disabled={quotaVol}
              onChange={handleFiles}
            />
            <Camera size={22} strokeWidth={2.5} aria-hidden="true" />
            Camera
          </label>
          <label
            className={`flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-3 py-3 text-base font-semibold text-ink transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${
              quotaVol ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-line/40"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={quotaVol}
              onChange={handleFiles}
            />
            <ImageIcon size={22} strokeWidth={2.5} aria-hidden="true" />
            Galerij
          </label>
        </div>
      )}

      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}

      {urls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {urls.map((url) => {
            const isLocal = lokaalId(url) !== null;
            const preview = isLocal ? blobUrls[url] : url;
            return (
              <div key={url} className="relative">
                <div className="relative aspect-square w-full overflow-hidden rounded-none border border-line">
                  {isLocal ? (
                    preview ? (
                      // Lokale foto: gewone <img>, object-URL is niet remote en niet
                      // door next/image te optimaliseren.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt="Foto wacht op netwerk"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-surface text-ink-muted">
                        <CloudOff size={28} aria-hidden="true" />
                      </div>
                    )
                  ) : (
                    <Image
                      src={url}
                      alt="Gemaakte foto"
                      fill
                      sizes="(min-width: 640px) 160px, 33vw"
                      className="object-cover"
                      loading="lazy"
                    />
                  )}
                  {isLocal && (
                    <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded-none bg-ink/80 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                      <CloudOff size={10} aria-hidden="true" />
                      Wacht
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => verwijder(url)}
                  aria-label="Foto verwijderen"
                  className="absolute -right-2 -top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-urgent-rood text-white shadow"
                >
                  <X size={16} strokeWidth={3} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
