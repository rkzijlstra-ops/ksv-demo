import { z } from "zod";

const PLACEHOLDER = /^(PLAK_HIER|TODO|XXX|YOUR_KEY_HERE|<.*>)$/i;

const notPlaceholder = (msg: string) =>
  z.string().refine((v) => !PLACEHOLDER.test(v.trim()), msg);

const envSchema = z.object({
  ANTHROPIC_API_KEY: notPlaceholder("ANTHROPIC_API_KEY is een placeholder").pipe(
    z.string().min(20, "ANTHROPIC_API_KEY ontbreekt of is te kort"),
  ),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-4-6"),
  OPENAI_API_KEY: notPlaceholder("OPENAI_API_KEY is een placeholder").pipe(
    z.string().min(20, "OPENAI_API_KEY ontbreekt of is te kort"),
  ),
  SUPABASE_URL: notPlaceholder("SUPABASE_URL is een placeholder").pipe(
    z
      .string()
      .min(1, "SUPABASE_URL ontbreekt")
      .refine((v) => v.startsWith("https://"), "SUPABASE_URL moet https:// zijn"),
  ),
  SUPABASE_PUBLISHABLE_KEY: notPlaceholder(
    "SUPABASE_PUBLISHABLE_KEY is een placeholder",
  ).pipe(z.string().min(20, "SUPABASE_PUBLISHABLE_KEY ontbreekt of is te kort")),
  SUPABASE_SECRET_KEY: notPlaceholder("SUPABASE_SECRET_KEY is een placeholder").pipe(
    z.string().min(20, "SUPABASE_SECRET_KEY ontbreekt of is te kort"),
  ),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Env-vars ongeldig of incompleet:\n${issues}\n\nCheck .env.local of run \`npm run check:env\`.`,
    );
  }
  return result.data;
}

let cached: Env | null = null;
export function env(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}
