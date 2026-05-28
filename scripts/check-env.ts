import { loadEnv } from "../src/lib/env.ts";

const tail = (s: string, n = 6) => `${s.slice(0, 10)}...${s.slice(-n)}`;

try {
  const env = loadEnv();
  console.log("\n  ✓ Alle env-vars OK\n");
  console.log(`    ANTHROPIC_MODEL          = ${env.ANTHROPIC_MODEL}`);
  console.log(`    ANTHROPIC_API_KEY        = ${tail(env.ANTHROPIC_API_KEY)}`);
  console.log(`    OPENAI_API_KEY           = ${tail(env.OPENAI_API_KEY)}`);
  console.log(`    SUPABASE_URL             = ${env.SUPABASE_URL}`);
  console.log(`    SUPABASE_PUBLISHABLE_KEY = ${tail(env.SUPABASE_PUBLISHABLE_KEY)}`);
  console.log(`    SUPABASE_SECRET_KEY      = ${tail(env.SUPABASE_SECRET_KEY)}\n`);
} catch (err) {
  console.error("\n  ✗ Env-validatie faalde:\n");
  console.error("  " + (err as Error).message.replace(/\n/g, "\n  "));
  console.error("");
  process.exit(1);
}
