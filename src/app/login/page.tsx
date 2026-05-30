"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

function LoginInhoud() {
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const foutParam = params.get("fout");

  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState<"" | "google" | "magic">("");
  const [bericht, setBericht] = useState("");
  const [fout, setFout] = useState(() => {
    if (!foutParam) return "";
    if (foutParam === "inlog-mislukt") return "Inloggen mislukt. Probeer opnieuw.";
    return `Inloggen mislukt: ${foutParam}`;
  });

  async function loginGoogle() {
    setBezig("google");
    setFout("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) {
      setFout(error.message);
      setBezig("");
    }
  }

  async function loginMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBezig("magic");
    setFout("");
    setBericht("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) {
      setFout(error.message);
    } else {
      setBericht(
        `Mail verstuurd naar ${email}. Open de mail op deze telefoon/laptop en klik op de inlog-link.`,
      );
    }
    setBezig("");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-4">
      <header className="relative mb-6 bg-primary px-5 py-5 text-white">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/70">KSV / Login</p>
        <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Inloggen</h1>
        <p className="mt-1 text-sm text-white/85">Keukenstudio Voorschoten — monteur-app</p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <button
        type="button"
        onClick={loginGoogle}
        disabled={bezig !== ""}
        className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-3 border-2 border-ink bg-white px-4 py-3 text-base font-extrabold uppercase tracking-[0.05em] text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig === "google" ? (
          <Loader2 size={22} className="animate-spin" aria-hidden="true" />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        Login met Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">
        <div className="h-px flex-1 bg-line" />
        of
        <div className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={loginMagicLink} className="flex flex-col gap-2">
        <label htmlFor="email" className="block font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">
          E-mailadres
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="jij@bedrijf.nl"
          className="min-h-[48px] border-2 border-line bg-white px-3 text-base text-ink focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
        />
        <button
          type="submit"
          disabled={bezig !== "" || !email.trim()}
          className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 bg-primary px-4 py-3 text-base font-extrabold uppercase tracking-[0.06em] text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
        >
          {bezig === "magic" ? (
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
          ) : (
            <Mail size={22} strokeWidth={2.5} aria-hidden="true" />
          )}
          Stuur magic link
        </button>
      </form>

      {bericht && (
        <p className="mt-4 flex items-start gap-2 border-2 border-success bg-success/5 p-3 text-sm font-semibold text-success">
          <CheckCircle2 size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {bericht}
        </p>
      )}
      {fout && (
        <p className="mt-4 flex items-start gap-2 border-2 border-urgent-rood bg-urgent-rood/5 p-3 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInhoud />
    </Suspense>
  );
}
