"use client";

import { useEffect, useRef, useState } from "react";
import { getPdfjs } from "@/lib/pdf-client";
import { DocumentIcoon } from "./DocumentIcoon";
import type { SoortMeta } from "@/lib/document-weergave";

// Per sessie onthouden, zodat een thumbnail maar één keer gerenderd/gehaald wordt.
const cache = new Map<string, string>();

/**
 * Mini-voorbeeld van een document: de eerste pagina (PDF) of de afbeelding zelf. Laadt LUI, pas als de
 * kaart in beeld komt (IntersectionObserver), zodat zware PDF's niet onnodig over 4G binnenkomen.
 * Tot het er is (of bij een fout) toont het het soort-icoon als nette terugval.
 */
export function DocumentVoorbeeld({
  url,
  type,
  iconKey,
  alt,
}: {
  url: string;
  type: "pdf" | "afbeelding";
  iconKey: SoortMeta["iconKey"];
  alt: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [zichtbaar, setZichtbaar] = useState(false);
  const [bron, setBron] = useState<string | null>(cache.get(url) ?? (type === "afbeelding" ? url : null));

  useEffect(() => {
    const el = ref.current;
    if (!el || zichtbaar) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setZichtbaar(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [zichtbaar]);

  useEffect(() => {
    if (!zichtbaar || bron || type !== "pdf") return;
    let af = false;
    (async () => {
      try {
        const pdfjs = await getPdfjs();
        const pdf = await pdfjs.getDocument({ url }).promise;
        const page = await pdf.getPage(1);
        const basis = page.getViewport({ scale: 1 });
        const schaal = (180 / basis.width); // kleine thumbnail, scherp genoeg
        const viewport = page.getViewport({ scale: schaal });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const data = canvas.toDataURL("image/png");
        if (af) return;
        cache.set(url, data);
        setBron(data);
      } catch {
        // stil: terugval op het icoon
      }
    })();
    return () => {
      af = true;
    };
  }, [zichtbaar, bron, type, url]);

  return (
    <div
      ref={ref}
      className="grid h-[68px] w-[52px] shrink-0 place-items-center overflow-hidden border border-line bg-white"
    >
      {bron ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bron} alt={alt} className="h-full w-full object-cover object-top" />
      ) : (
        <DocumentIcoon iconKey={iconKey} size={22} className="text-ink-muted" />
      )}
    </div>
  );
}
