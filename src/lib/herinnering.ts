/**
 * Het kantelpunt voor de bevestig-herinnering: klussen die vóór dit moment zijn verstuurd en nog niet
 * bevestigd, krijgen een herinnering. Puur, zodat de cron-logica testbaar blijft.
 */
export function herinneringCutoff(nu: Date, uren: number): string {
  return new Date(nu.getTime() - uren * 60 * 60 * 1000).toISOString();
}
