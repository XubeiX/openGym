/* Fork extension (Etap 2): ptv4's numbers for openGym. The browser asks this api with its own
 * session; the api asks ptv4's sidecar over the opengym-ext Docker network (PTV4_URL, PTV4_KEY),
 * so the key never reaches the browser and the sidecar's port 8091 is never published.
 *
 * Written as a factory taking server.js's helpers, like coach/routes.js.
 */

// ?set= → the sidecar's path. Anything else is a 400.
const SETS = {
  lifts: 'dashboard/lifts', body: 'dashboard/body', energy: 'dashboard/energy', volume: 'dashboard/volume',
  goals: 'dashboard/goals', pain: 'dashboard/pain', kpi: 'dashboard/kpi', garmin_kpi: 'dashboard/garmin_kpi',
  garmin_daily: 'dashboard/garmin_daily', readiness: 'dashboard/readiness',
  'raw-measurements': 'raw/measurements', 'raw-garmin': 'raw/garmin',
  health: 'health' // Etap 2b: Garmin, Fitatu and backups, judged by the sidecar
};
const TIMEOUT_MS = 15000;

export function extRoutes({ json, readSession, env = process.env, fetchImpl = fetch }) {
  return {
    'GET /api/ext/ptv4': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      if (!env.PTV4_URL || !env.PTV4_KEY || !env.PTV4_UID) return json(res, 503, { error: 'ptv4 nie jest podłączony do tego serwera' });
      // ptv4 reads one profile's state file: everyone else gets nothing from it
      if (user.id !== env.PTV4_UID) return json(res, 403, { error: 'ptv4 liczy dane innego profilu' });
      const path = SETS[new URL(req.url, 'http://x').searchParams.get('set')];
      if (!path) return json(res, 400, { error: 'nieznany zbiór', sets: Object.keys(SETS) });
      let r;
      try {
        r = await fetchImpl(`${env.PTV4_URL.replace(/\/$/, '')}/${path}`,
          { headers: { 'X-Ext-Key': env.PTV4_KEY }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      } catch {
        return json(res, 503, { error: 'Sidecar ptv4 nie odpowiada' });
      }
      const body = await r.text();
      if (!r.ok) {
        let detail = null;
        try { detail = JSON.parse(body).error; } catch { /* not JSON */ }
        return json(res, 503, { error: `Sidecar ptv4: HTTP ${r.status}`, detail });
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(body);
    }
  };
}
