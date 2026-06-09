import Image from "next/image";
import { ImageOff } from "lucide-react";

export function FotoGalerij({ urls, startNummer = 1 }: { urls: string[]; startNummer?: number }) {
  if (urls.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-none border border-line bg-surface p-4 text-sm text-ink-muted">
        <ImageOff size={20} aria-hidden="true" />
        Nog geen foto&apos;s
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {urls.map((url, i) => {
        const nr = startNummer + i;
        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block aspect-square overflow-hidden rounded-none border border-line"
          >
            <Image
              src={url}
              alt={`Foto ${nr}`}
              fill
              sizes="(min-width: 640px) 200px, 50vw"
              className="object-cover"
              loading="lazy"
              unoptimized={false}
            />
            <span className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center bg-ink text-xs font-extrabold text-white">
              {nr}
            </span>
          </a>
        );
      })}
    </div>
  );
}
