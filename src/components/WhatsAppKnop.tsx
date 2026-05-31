import { MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

/**
 * Opent WhatsApp met de klant (wa.me-deeplink), eventueel met een vooringevuld bericht.
 * Toont niets als er geen bruikbaar nummer is.
 */
export function WhatsAppKnop({ telefoon, bericht }: { telefoon: string | null; bericht?: string }) {
  const url = whatsappUrl(telefoon, bericht);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-[56px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-none border-2 border-success bg-white px-2 py-3 text-sm font-bold text-success transition-colors duration-150 hover:bg-success/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-success"
    >
      <MessageCircle size={20} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
      WhatsApp
    </a>
  );
}
