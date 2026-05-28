import { ImageOff } from "lucide-react";

export function FotoGalerij({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface p-4 text-sm text-ink-muted">
        <ImageOff size={20} aria-hidden="true" />
        Nog geen foto&apos;s
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {urls.map((url, i) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl border border-line"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Foto ${i + 1}`}
            className="aspect-square h-full w-full object-cover"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
