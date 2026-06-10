import { describe, it, expect } from "vitest";
import { loadEnv } from "./env";

const validEnv = {
  NODE_ENV: "test",
  ANTHROPIC_API_KEY: "sk-ant-api03-" + "x".repeat(80),
  ANTHROPIC_MODEL: "claude-sonnet-4-6",
  OPENAI_API_KEY: "sk-proj-" + "x".repeat(80),
  SUPABASE_URL: "https://qbynjfscdxhwdkzfqjjg.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_" + "x".repeat(20),
  SUPABASE_SECRET_KEY: "sb_secret_" + "x".repeat(20),
};

describe("loadEnv", () => {
  it("geeft env terug als alle vars valid zijn", () => {
    const env = loadEnv(validEnv as NodeJS.ProcessEnv);
    expect(env.SUPABASE_URL).toBe(validEnv.SUPABASE_URL);
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-4-6");
  });

  it("gebruikt default voor ANTHROPIC_MODEL als die ontbreekt", () => {
    const { ANTHROPIC_MODEL: _ignored, ...withoutModel } = validEnv;
    const env = loadEnv(withoutModel as NodeJS.ProcessEnv);
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-4-6");
  });

  it("gooit Error als ANTHROPIC_API_KEY ontbreekt", () => {
    const { ANTHROPIC_API_KEY: _ignored, ...withoutKey } = validEnv;
    expect(() => loadEnv(withoutKey as NodeJS.ProcessEnv)).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("gooit Error als SUPABASE_URL geen geldige URL is", () => {
    expect(() =>
      loadEnv({ ...validEnv, SUPABASE_URL: "geen-url" } as NodeJS.ProcessEnv),
    ).toThrow(/SUPABASE_URL/);
  });

  it("gooit Error als SUPABASE_SECRET_KEY leeg is", () => {
    expect(() =>
      loadEnv({ ...validEnv, SUPABASE_SECRET_KEY: "" } as NodeJS.ProcessEnv),
    ).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("gooit Error met PLAK_HIER-placeholder", () => {
    expect(() =>
      loadEnv({ ...validEnv, SUPABASE_PUBLISHABLE_KEY: "PLAK_HIER" } as NodeJS.ProcessEnv),
    ).toThrow(/SUPABASE_PUBLISHABLE_KEY/);
  });
});
