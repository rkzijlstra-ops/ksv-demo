import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MeldingForm } from "@/components/MeldingForm";

export default function NieuweMeldingPagina() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center gap-1 text-base font-semibold text-primary hover:underline"
      >
        <ChevronLeft size={22} aria-hidden="true" />
        Werkbak
      </Link>

      <h1 className="mb-5 mt-2 text-2xl font-bold text-ink">Nieuwe melding</h1>

      <MeldingForm />
    </main>
  );
}
