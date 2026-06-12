// Nulmeting: data-laad-tijd van de zwaarste pagina's, serieel (zoals voorheen) vs parallel.
// Alleen lezen, geen schrijfacties. Draait tegen de DB uit .env.local (productie).
//
// Gebruik:  node --env-file=.env.local scripts/perf-meting.mjs [opdracht_id] [referentienummer]
//
// Bedoeld om te herhalen voor/na een verbouwing of Vercel-update. Let op: dit meet vanaf deze
// machine naar Supabase. De absolute getallen verschillen van Vercel, maar de verhouding
// serieel/parallel (de winst van het parallel laden) is wat hier telt.
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL/SUPABASE_SECRET_KEY ontbreken (draai met --env-file=.env.local).");
  process.exit(1);
}
const H = { apikey: key, Authorization: `Bearer ${key}` };
const OPDRACHT = process.argv[2] || "38d08232-2ba0-4551-91fc-8a0ce1926f55";
const REF = process.argv[3] || "192920";

async function get(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: H });
  await r.text();
  return r.status;
}

const detailReads = [
  () => get(`meldingen?id=eq.${OPDRACHT}&select=*`),
  () => get(`documenten?opdracht_id=eq.${OPDRACHT}&select=*`),
  () => get(`meldingen?opdracht_id=eq.${OPDRACHT}&select=*`),
  () => get(`opleveringen?opdracht_id=eq.${OPDRACHT}&select=*`),
  () => get(`rapport_verzendingen?opdracht_id=eq.${OPDRACHT}&select=*`),
  () => get(`gebeurtenissen?opdracht_id=eq.${OPDRACHT}&select=*`),
  () => get(`meldingen?referentienummer=eq.${REF}&select=*`),
];
const opleverReads = [
  () => get(`meldingen?id=eq.${OPDRACHT}&select=*`),
  () => get(`meldingen?opdracht_id=eq.${OPDRACHT}&select=*`),
  () => get(`profielen?select=*&limit=1`),
];

async function serieel(reads) {
  const t = performance.now();
  for (const r of reads) await r();
  return performance.now() - t;
}
async function parallel(reads) {
  const t = performance.now();
  await Promise.all(reads.map((r) => r()));
  return performance.now() - t;
}
const mediaan = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function meet(naam, reads) {
  await serieel(reads); // warm-up, niet meegeteld
  const ser = [], par = [];
  for (let i = 0; i < 5; i++) ser.push(await serieel(reads));
  for (let i = 0; i < 5; i++) par.push(await parallel(reads));
  const s = mediaan(ser), p = mediaan(par);
  console.log(
    `${naam.padEnd(34)} serieel ${String(Math.round(s)).padStart(5)} ms   parallel ${String(Math.round(p)).padStart(5)} ms   ~${Math.round((1 - p / s) * 100)}% sneller`,
  );
}

console.log("NULMETING data-laden (mediaan van 5, alleen lezen)\n");
await meet(`Opdracht openen (${detailReads.length} reads)`, detailReads);
await meet(`Oplevering openen (${opleverReads.length} reads)`, opleverReads);
