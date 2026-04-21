// Home Assistant client. Pulls the server's energy usage (kWh) for a given
// billing period from HA's history API.
//
// Strategy: read the sensor's state at two points in time and take the
// difference. This works for any cumulative energy sensor (e.g. a
// utility_meter or an energy-dashboard `_kwh` sensor). Non-cumulative
// sensors would need the /api/history/period endpoint + integration —
// not needed here.

const BASE = import.meta.env.VITE_HA_URL ?? "";
const TOKEN = import.meta.env.VITE_HA_TOKEN ?? "";
const ENTITY_ID = import.meta.env.VITE_SERVER_ENTITY_ID ?? "";

/** True when all HA config is present. If not, `fetchServerKwh` returns 0. */
const HA_CONFIGURED = Boolean(BASE && TOKEN && ENTITY_ID);

export interface UsageRange {
  start: Date;
  end: Date;
}

/**
 * Fetch the server's energy usage in kWh across the billing period.
 *
 * Reads the entity state at `start` and `end` and returns the difference.
 * Throws if HA is unreachable, the entity is missing, or either value is
 * not a number.
 *
 * If HA isn't configured (any of VITE_HA_URL / VITE_HA_TOKEN /
 * VITE_SERVER_ENTITY_ID missing), returns 0 — the whole bill gets split
 * evenly. Useful for running locally before HA is wired up.
 */
export async function fetchServerKwh({ start, end }: UsageRange): Promise<number> {
  if (!HA_CONFIGURED) return 0;

  const [startKwh, endKwh] = await Promise.all([
    stateAt(ENTITY_ID, start),
    stateAt(ENTITY_ID, end),
  ]);

  const usage = endKwh - startKwh;
  if (usage < 0) {
    throw new Error(
      `Negative usage (${usage.toFixed(2)} kWh) — sensor may have reset mid-period`,
    );
  }
  return usage;
}

/**
 * Return the numeric state of `entityId` at the given moment.
 *
 * HA's /api/history/period returns states between `timestamp` and (by
 * default) a day later. We take the first entry — the state at or just
 * after the requested moment.
 */
async function stateAt(entityId: string, at: Date): Promise<number> {
  const iso = at.toISOString();
  const url = new URL(`${BASE}/api/history/period/${iso}`, window.location.origin);
  url.searchParams.set("filter_entity_id", entityId);
  url.searchParams.set("minimal_response", "true");
  url.searchParams.set("no_attributes", "true");
  url.searchParams.set("end_time", new Date(at.getTime() + 60 * 60 * 1000).toISOString());

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`HA ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as Array<Array<{ state: string }>>;
  const first = body[0]?.[0]?.state;
  if (first == null) {
    throw new Error(`No history for ${entityId} at ${iso}`);
  }
  const n = Number(first);
  if (!Number.isFinite(n)) {
    throw new Error(`Non-numeric state for ${entityId}: ${first}`);
  }
  return n;
}
