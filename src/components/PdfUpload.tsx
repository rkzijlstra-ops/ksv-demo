"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check, AlertCircle } from "lucide-react";

type Status = "idle" | "uploading" | "success" | "error";

export function PdfUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse-pdf", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(body.error ?? `Upload mislukt (${res.status})`);
        return;
      }

      setStatus("success");
      setMessage(`Opdracht toegevoegd${body.klant_naam ? `: ${body.klant_naam}` : ""}`);
      router.refresh();
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      setMessage("Netwerkfout, probeer opnieuw");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const uploading = status === "uploading";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={handleFile}
        disabled={uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface px-4 py-3 text-base font-semibold text-ink transition-colors duration-150 hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <>
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
            PDF inlezen…
          </>
        ) : (
          <>
            <Upload size={22} strokeWidth={2.5} aria-hidden="true" />
            PDF-opdracht toevoegen
          </>
        )}
      </button>

      {status === "success" && (
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-success">
          <Check size={18} strokeWidth={2.5} aria-hidden="true" />
          {message}
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {message}
        </p>
      )}
    </div>
  );
}
